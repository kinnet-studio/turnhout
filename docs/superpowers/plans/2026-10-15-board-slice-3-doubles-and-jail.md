# Board Games Slice 3 (Doubles and Jail) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rent Day gains doubles and jail, written entirely in its own text. To get there, the language gains facts about players, the dice faces of each roll, buttons named by their whole done-wording, a move that skips the board and a plain fine. Slice 2's leftovers are cleared too.

**Architecture:**
- **Language layer only.** All new work is in the language (`src/engine/core/lang/`), the views, the designer page and Rent Day's text. Core `game-state.ts`, `flow.ts` and `game-engine.ts` stay untouched. No jail logic anywhere but `src/games/rent-day.rules`.
- **Where the new state lives.**
  - Player facts use slice 2's store (`playerFact` / `setPlayerFact` under `lang:facts`).
  - Each seat's roll faces this turn go in a new key, `lang:turn-rolls`, next to the turn log. `clearTurnLog` empties both, so they go wherever the turn passes (After line, `chooseNext`).
- **New vocabulary types.** `{playerflag}` and `{playernumber}`.
- **`{done}` now resolves to a list of move types.** A bare participle names every button of that verb. A participle plus the rest of a wording names that one button.
- **A new phrase option, `needsTwoDice`,** turns "a double" in a game without exactly two dice into a compile error.
- **New phrases.**
  - Player-fact phrases go in a new file, `library/player-facts.ts`.
  - Dice, done-wording, movement and fine phrases stay in `library/board-phrases.ts`.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19.

**Spec:** `docs/superpowers/specs/2026-10-15-board-slice-3-doubles-and-jail-design.md` (part of `docs/superpowers/specs/2026-10-15-board-games-overview-design.md`).

## Global Constraints

- **Branch and commands.** Work on `claude/peaceful-curie-rdfkow`. Single test file: `bunx vitest run <path>`. Full suite: `bun run test` (1632 tests pass at the start). Types: `bun run typecheck`.
- **No new dependencies.**
- **Pure core.** `src/engine/core/**` stays pure: no pixi, react or DOM imports, no `Math.random` or `Date.now`.
- **Files not to touch:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, and `src/pages/hearts-demo/**`.
- **Json shapes.** Everything in `CompiledGame` and every `lang:*` value is `Json`. Declare these shapes with `type` aliases, and use `null` (never `undefined`) inside them.
- **No Monopoly words in shared code.**
  - Banned words: rent, house, hotel, street, station, utility, money and jail.
  - They must not appear in engine or language code outside `src/engine/core/lang/library/rent-day.ts`, not even in comments.
  - They may appear in tests, test fixtures (`lang/testing.ts`) and `src/games/*.rules`.
  - "double" is a general dice word and may appear in the language.
  - No non-test file under `src/pages/designer/` may contain "jail": the page shows player facts by a general rule.
- **No engine words in front of designers.** Diagnostics, rejection reasons, example results and the page never show engine vocabulary (`FlowDef`, `NamedRef`, `zoneId`, `lang:`) or stack traces.
- **Existing behaviour stays.**
  - Hearts, Color Match and Venom compile with no diagnostics and pass their examples.
  - Rent Day's 31 examples keep passing. One reason changes in Task 6: "you cannot roll twice in one turn" now fails the roll button's `Only if one of:` group.
  - `{done}` now resolves to a list (Task 1). Every test that reads its value is updated there.
- **Style and commits.**
  - 2-space indent, single quotes, chainable registrars, and comments that say why.
  - Commit prefixes: `feat(lang):`, `fix(lang):`, `feat(games):`, `feat(designer):`, `docs:`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.

## Review Focus

- **Another seat's double, or a double from a turn that has passed, never counts for "they rolled a double".** This holds even though the latest roll on the table is still that double. Test in Task 3.
- **A bare participle that names two buttons in a Given line gets a sentence asking for the whole wording.** "Given p0 has rolled this turn" with two roll buttons is never a silent pick of one. Test in Task 1.
- **"Their piece goes straight to …" for a player with no piece is refused** with "They have no piece on the board.". It never puts an out player's piece back on the board. Test in Task 1.
- **Rules about a player's facts skip players who are out.** "When a player has 3 jail turns:" never picks an out player whose count is still 3, which would fire forever on a piece that isn't there. Test in Task 2.
- **Player facts read the way a designer types them:** any capitals ("Players can be In Jail.", then "They Are In Jail."), and the singular for a count of one ("They gain 1 Jail Turn.", "Then p0 has 1 jail turn"). Test in Task 2.

---

### Task 1: Done-wordings, going straight to a space, a plain fine, and the roll after that

**Files:**
- Modify: `src/engine/core/lang/refs.ts` (`DONE`)
- Modify: `src/engine/core/lang/library/board-phrases.ts`
- Test: `src/engine/core/lang/refs.test.ts`, `src/engine/core/lang/compile-phase.test.ts`, `src/engine/core/lang/declared-actions.test.ts`, `src/engine/core/lang/library/board-phrases.test.ts`

**Interfaces:**
- **`{done}` resolves to `string[]`:** the move types it names, deduplicated, in `vocab.actions` order.
  - A bare participle (`rolled`) names every button whose verb has that participle.
  - A done-wording names that one button. It is `participle(verb)` followed by the rest of the button's `words`: `rolled for a double`, `ended their turn`, `built a house on a street they own`.
  - Text that is both (a one-word button) reads as the bare participle.
  - Text that is neither is no match (`parseParam` gives null).
- **Conditions:**
  - `they have {done} this turn` holds when any of its move types was done this turn;
  - `they have not {done} this turn` holds when none was.
- **Given `{player} has {done} this turn`** records its one move type. A list of more than one is a RuleError built from the shared verb's participle and the wordings: `“rolled” could mean “roll the dice” or “roll for a double”; write the whole wording.` (`joinOr` of the quoted wordings).
- **After lines are unchanged.** A bare verb two buttons share is still `“rolls” could be “roll the dice” or “roll for a double”; write the whole wording.`
- **New phrases:**
  - Effect `'their piece goes straight to {space}'` (needsPlayer, needsBoard).
    - It calls `placePiece` and nothing else: no pass or land moments, so Go pays nothing on the way.
    - A player with no piece gets RuleError `They have no piece on the board.`
  - Effect `'they pay {int}'` (needsPlayer, needsPayment) pays that amount to the bank in the pay-with counter, through the file's `transfer`.
  - Given `'the roll after that is {int} and {int}'` and `'the roll after that is {int}'` queue a roll behind the ones already queued.
    - They run the same checks as `nextRollIs`.
    - With no roll queued (`takeQueuedRoll(state).faces === null`) they throw RuleError `Say what the next roll is first.`

- [ ] **Step 1: Write the failing tests.**

In `refs.test.ts`, change every `{done}` value to a list:
- `'rolled'` → `['roll the dice']`;
- in the building test, `'built'` → `['build a house', 'build a hotel']` (no longer an error) and `'built a hotel'` → `['build a hotel']`;
- the same wording in two phases → `['roll the dice']`;
- the targeted `'built'` → `['build a house on a street they own']`;
- the inside-a-library args → `['p1', ['roll the dice'], 2, 'money']`.

Then add:

```ts
it('reads a bare participle as every button with that verb, and a whole done-wording as one button', () => {
  const rolls = vocabFrom({ maxPlayers: 2, actions: [
    { verb: 'roll', words: 'roll the dice', base: 'roll the dice', targeted: false },
    { verb: 'roll', words: 'roll for a double', base: 'roll for a double', targeted: false },
    { verb: 'end', words: 'end their turn', base: 'end their turn', targeted: false },
  ] });
  expect(parseParam('done', 'rolled', rolls)).toEqual({ value: ['roll the dice', 'roll for a double'] });
  expect(parseParam('done', 'Rolled For A Double', rolls)).toEqual({ value: ['roll for a double'] });
  expect(parseParam('done', 'rolled the dice', rolls)).toEqual({ value: ['roll the dice'] });
  expect(parseParam('done', 'ended their turn', rolls)).toEqual({ value: ['end their turn'] });
  expect(parseParam('done', 'ended', rolls)).toEqual({ value: ['end their turn'] });
  expect(parseParam('done', 'rolled two doubles', rolls)).toBeNull();
});
```

In `compile-phase.test.ts`, inside the describe whose `phase` helper compiles under `TINY_BOARD_HEAD` (first phase line is 18), replace "says which buttons “built” could mean …" with:

```ts
it('reads “rolled” as every roll button and a whole done-wording as one, while an After line still needs one button', () => {
  const buttons = [
    'A player may roll the dice.', 'A player may roll for a double.', 'A player may end their turn.',
    '  Only if they have rolled this turn.', '  Only if they have not rolled for a double this turn.',
  ];
  const { game, diagnostics } = phase(buttons);
  expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(game!.phases[0].actions[2].conditions.map((g) => g.refs[0].args)).toEqual([[['roll the dice', 'roll for a double']], [['roll for a double']]]);
  expect(errorsOf([...buttons, 'After a player rolls, the turn passes to the left.'])).toEqual([
    [23, '“rolls” could be “roll the dice” or “roll for a double”; write the whole wording.'],
  ]);
});
```

In `declared-actions.test.ts`:

```ts
it('lets either roll button count as having rolled, and records only the one pressed', () => {
  const twoRolls = compileGame(TINY_BOARD.replace('  A player may end their turn.', [
    '  A player may roll for a double.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.',
    '  A player may end their turn.',
  ].join('\n')), lib).game!;
  for (const first of ['roll the dice', 'roll for a double']) {
    const engine = engineWith((s) => queueRoll(s, [1, 2]), twoRolls);
    expect(engine.dispatch({ type: 'end their turn', by: 'p0' }).reason).toBe('they have rolled this turn');
    expect(engine.dispatch({ type: first, by: 'p0' }).ok).toBe(true);
    expect(engine.getState().data[TURN_KEY]).toEqual({ p0: [first] });
    expect(engine.dispatch({ type: 'end their turn', by: 'p0' }).ok).toBe(true);
  }
});
```

In `library/board-phrases.test.ts`:
- **Straight to a space.** Use a counting `announce` and the file's `env`/`as` helpers.
  - `their piece goes straight to Go` (subject p0, piece on space 5) leaves the piece on 0.
  - `announce` is never called.
  - p0 still has 1500 money.
- **Review Focus.** `their piece goes straight to Go` for p1 after `markOut(fixtureBoardState(), 'p1')` throws `They have no piece on the board.`, and p1 still has no piece.
- **A plain fine.** `they pay 50` (subject p0) gives p0 1450 and leaves p1 at 1500.
- **The roll after that.** In the `example phrases` describe, using `withDice` and `rollGiven`:
  - after `the next roll is 3 and 3`, `the roll after that is 1 and 2` queues behind it: two `takeQueuedRoll` calls give `[3, 3]`, then `[1, 2]`;
  - with nothing queued it throws `Say what the next roll is first.`;
  - `the roll after that is 3` after a two-dice next roll throws `This game rolls 2 dice, so give 2 numbers.`;
  - in a one-die d20 game, `the next roll is 5` then `the roll after that is 20` queues `[20]` second.
- **Review Focus,** in the same describe:

```ts
it('asks for the whole wording when “rolled” could be either roll button', () => {
  const FOR_DOUBLE: DeclaredAction = { ...ROLL, words: 'roll for a double', base: 'roll for a double', label: 'Roll for a double' };
  const twoRolls = fixtureBoardGame({ phases: [fixturePhase('playing', [], { actions: [ROLL, FOR_DOUBLE, END] })] });
  const givenIn = (text: string) => runPhrase<GameState>(lib, 'given', text, env(fixtureBoardState(twoRolls), { game: twoRolls }));
  expect(() => givenIn('p0 has rolled this turn')).toThrow('“rolled” could mean “roll the dice” or “roll for a double”; write the whole wording.');
  expect(givenIn('p0 has rolled for a double this turn').data[TURN_KEY]).toEqual({ p0: ['roll for a double'] });
});
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/refs.test.ts src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/library/board-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Grep for other readers of a `{done}` value (`hasDoneThisTurn`, `hasDoneGiven`, any test) and update them.
- [ ] **Step 4: Run** the four files, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit** `feat(lang): done-wordings name one button and a bare participle every button of its verb; straight to a space, a plain fine, the roll after that`

---

### Task 2: Fact names of several words, and facts about players

**Files:**
- Modify: `src/engine/core/lang/phrases.ts` (`{factlist}`)
- Modify: `src/engine/core/lang/refs.ts` (`{playerflag}`, `{playernumber}`; add both to `VOCAB_TYPES`)
- Create: `src/engine/core/lang/library/player-facts.ts` (`registerPlayerFactPhrases`)
- Modify: `src/engine/core/lang/library/index.ts` (add it to `REGISTRARS` right after `registerFactPhrases`)
- Modify: `src/engine/core/lang/compile.ts` (`acceptFacts`)
- Test: `src/engine/core/lang/phrases.test.ts`, `src/engine/core/lang/compile.test.ts`, create `src/engine/core/lang/library/player-facts.test.ts`

**Interfaces:**
- **`{factlist}` splits first, then reads names.**
  - The text is split at the separators first (`, and `, `, `, ` and `), never by trying every separator position as `splitList` does.
  - Each item is `a`/`an` + a name (a flag) or a bare name (a number).
  - A name is one or more words, lowercased. None of its words is "and", it holds no comma, and its first word is not a number, "a" or "an".
  - So `jail turns` is one number, and `houses and a hotel` stays two facts.
- **Vocab types** (`declaredWord`):
  - `{playerflag}`: label `[player fact]`, what `player fact`, flags on players, no singulars.
  - `{playernumber}`: the same for numbers on players, with singulars ("jail turn" → `'jail turns'`).
- **`player-facts.ts` phrases.**
  - A number never set reads 0, and a flag never set reads false.
  - All conditions and effects are needsPlayer.

| Kind | Pattern | Does |
|---|---|---|
| declare | `'players can have {factlist}'` | facts with `on: 'player'` |
| declare | `'players can be {name}'` | one flag on players |
| condition | `'they are {playerflag}'` / `'they are not {playerflag}'` | reads the flag |
| condition | `'they have {int} {playernumber}'` | exactly that many |
| effect | `'they are {playerflag}'` / `'they are not {playerflag}'` | sets it to true / false |
| effect | `'they gain {int} {playernumber}'` | adds |
| effect | `'their {playernumber} go back to {int}'` | sets |
| who | `'a player is {playerflag}'`, `'a player has {int} {playernumber}'` | players still in (`playersIn`), in seat order |
| given | `'{player} is {playerflag}'`, `'{player} has {int} {playernumber}'` | sets directly |
| expect | `'{player} is {playerflag}'` | `Expected p0 to be in jail, but they aren't.` |
| expect | `'{player} is not {playerflag}'` | `Expected p1 not to be in jail, but they are.` |
| expect | `'{player} has {int} {playernumber}'` | `Expected p0 to have 1 jail turn, but they have 0.` (`counted`) |

- **`acceptFacts` name checks.** For a fact with `on: 'player'`, these run before the existing column and duplicate checks, and the error goes on the declaring line:
  - a name equal to a counter of the board: `“money” is already a number each player has.`;
  - the name `out`: `“out” is already how a player leaves the game.`

- [ ] **Step 1: Write the failing tests.**

In `phrases.test.ts`, replace "wants one word for each fact, and no count" with:

```ts
it('takes names of several words, splitting at commas and “and” first', () => {
  expect(read('Spaces can have jail turns')).toMatchObject({ args: [[{ name: 'jail turns', kind: 'number' }]] });
  expect(read('Spaces can have hit points, a big hotel and an Old Inn')).toMatchObject({ args: [[
    { name: 'hit points', kind: 'number' }, { name: 'big hotel', kind: 'flag' }, { name: 'old inn', kind: 'flag' },
  ]] });
});
it('wants no count, no lone article and no empty name', () => {
  for (const list of ['3 houses', 'a', 'houses and', 'houses,, a hotel', 'a a', 'and', 'an and']) {
    expect(read(`Spaces can have ${list}`).status, list).toBe('unknown');
  }
});
```

In `compile.test.ts`, in `declaring facts and the bank` (its `withFacts` lines start at 15; import `runExamples` from `./examples`):

```ts
it('declares facts about players, with names of several words', () => {
  const { game, diagnostics } = compiled(withFacts('  Players can be in jail.', '  Players can have jail turns and a crown.'));
  expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(game!.facts).toEqual([
    { name: 'in jail', on: 'player', kind: 'flag' }, { name: 'jail turns', on: 'player', kind: 'number' }, { name: 'crown', on: 'player', kind: 'flag' },
  ]);
});
it('refuses a fact about players that a counter or “out” already names', () => {
  expect(errors(withFacts('  Players can have money.'))).toEqual([[15, '“money” is already a number each player has.']]);
  expect(errors(withFacts('  Players can be out.'))).toEqual([[15, '“out” is already how a player leaves the game.']]);
  expect(errors(withFacts('  Spaces can have tokens.', '  Players can have tokens.'))).toEqual([[16, 'There are two facts called “tokens”.']]);
});
it('reads player facts in any capitals, and a count of one in the singular', () => {
  const text = `${withFacts('  Players can be In Jail.', '  Players can have Jail Turns.')}\n${[
    '  A player may wait.', '    Only if They Are In Jail.', '    Then:', '      They gain 1 Jail Turn.',
    '', 'Example: waiting in jail', '  Given p0 is in jail', '  When p0 waits', '  Then p0 has 1 jail turn', '  And p0 is in jail',
  ].join('\n')}`;
  const { game, diagnostics } = compiled(text);
  expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(runExamples(game!, createDefaultLibrary())).toEqual([expect.objectContaining({ status: 'pass' })]);
});
```

Create `library/player-facts.test.ts`:
- **Fixtures.**
  - `game = fixtureBoardGame({ facts: [{ name: 'in jail', on: 'player', kind: 'flag' }, { name: 'jail turns', on: 'player', kind: 'number' }] })`.
  - Seats `['p0', 'p1', 'p2']`, and states from `fixtureBoardState(game, seats)`.
  - Phrases run through `runPhrase` with `fixtureEnv(state, { game, seats, subject })`.
- **A flag.**
  - `they are in jail` is false at the start, and `they are not in jail` is true.
  - The effect `they are in jail` with subject p1 sets `playerFact(s, 'p1', 'in jail') === true` and leaves p0's at `null`.
  - The condition then holds for p1 and not for p0.
  - `they are not in jail` sets it back to `false`.
- **A number.**
  - `they have 0 jail turns` holds at the start.
  - Two runs of `they gain 1 jail turn` give 2, and `they have 2 jail turns` then holds.
  - `their jail turns go back to 0` gives 0.
- **Review Focus: rules about a player.**
  - Set p0 and p1 to 3 jail turns, put p2 in jail, then `markOut(s, 'p0')`.
  - `a player has 3 jail turns` (no subject) gives `['p1']`.
  - `a player is in jail` gives `['p2']`.
- **Examples.**
  - The Givens `p1 is in jail` and `p1 has 2 jail turns` set the facts.
  - The Expects give `true` or the three exact sentences in the table above:
    - `p0 is in jail` on a fresh state;
    - `p1 is not in jail` after p1 is put in jail;
    - `p0 has 1 jail turn` on a fresh state.
- **A misspelt fact.** `lib.misnamed(['condition'], 'they are in jial', vocabFor(game))` equals `{ kind: 'condition', problem: { message: 'There is no player fact called “in jial”.', suggestions: ['in jail'] } }`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/phrases.test.ts src/engine/core/lang/compile.test.ts src/engine/core/lang/library/player-facts.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Keep "jail" out of `player-facts.ts`, comments included; say "a player fact" in comments.
- [ ] **Step 4: Run** the three files, then `bun run test` and `bun run typecheck`. Hearts, Color Match, Venom and Rent Day compile unchanged.
- [ ] **Step 5: Commit** `feat(lang): facts about players, and fact names of several words`

---

### Task 3: The dice faces of each roll this turn, doubles, and the two-dice check

**Files:**
- Modify: `src/engine/core/lang/board-state.ts`
- Modify: `src/engine/core/lang/types.ts` (`Vocab.diceCount`)
- Modify: `src/engine/core/lang/phrases.ts` (`PhraseOpts.needsTwoDice`, `given(p, fn, opts?)`, `get()`, `emptyVocab`, `vocabFrom`)
- Modify: `src/engine/core/lang/compile-util.ts` (`unmetNeed`)
- Modify: `src/engine/core/lang/library/board-phrases.ts`
- Test: `src/engine/core/lang/board-state.test.ts`, `src/engine/core/lang/library/board-phrases.test.ts`, `src/engine/core/lang/compile-phase.test.ts`

**Interfaces:**
- **`board-state.ts`:**
  - `TURN_ROLLS_KEY = 'lang:turn-rolls'`: `{ [seat]: number[][] }`, each roll's faces in the order rolled.
  - `recordRoll(state: GameState, seat: PlayerId, faces: number[]): GameState`.
  - `rollsThisTurn(state: GameState, seat: PlayerId): number[][]` gives `[]` when none.
  - `setRollsThisTurn(state: GameState, seat: PlayerId, rolls: number[][]): GameState`.
  - `clearTurnLog` empties the turn log and the turn rolls, each only when it has entries. A state with neither comes back as it is.
- **`types.ts`:** `Vocab.diceCount: number` is the board's dice count, 0 without dice. `vocabFrom` and `emptyVocab` fill it.
- **`phrases.ts`:**
  - `PhraseOpts.needsTwoDice?: boolean`, also returned by `get()`.
  - `PhraseLibrary.given(p: string, fn: EffectFn, opts?: PhraseOpts): this`.
- **`compile-util.ts` `unmetNeed`.** Right after the `needsDice` check, `needsTwoDice && vocab.diceCount !== 2` gives `A double needs exactly two dice.` Every doubles phrase also sets `needsDice`, so a game with no dice still hears that it needs dice.
- **`board-phrases.ts`:**
  - `export function isDouble(faces: number[]): boolean` is true for exactly two equal faces.
  - `rollDice` also calls `recordRoll` for `env.subject.player` when there is one (queued and random rolls alike). Any button that rolls counts.
  - Conditions (needsPlayer, needsDice, needsTwoDice):
    - `'they rolled a double'` reads the player's own last roll this turn, and is false with none;
    - `'they did not roll a double'` is its negation;
    - `'they have rolled {int} double(s) this turn'` counts exactly;
    - `'they have rolled fewer than {int} double(s) this turn'`.
  - Who `'a player has rolled {int} double(s) this turn'` (needsDice, needsTwoDice) gives players still in, in seat order, with exactly that many.
  - Given `'{player} has rolled {int} double(s) this turn'` (needsDice, needsTwoDice):
    - sets their turn rolls to n rolls of `[1, 1]`;
    - when n > 0, also records as done the first button of the current phase whose Then lines roll the dice. That is a `roll the dice` effect ref, alone or as the effect of an `if` ref. So "they have rolled this turn" holds, and "they have not rolled for a double this turn" still holds in Rent Day.
    - With no such button: RuleError `No button in this phase rolls the dice.`

- [ ] **Step 1: Write the failing tests.**

In `board-state.test.ts`:

```ts
it('keeps each roll of a seat this turn, apart from the other seats', () => {
  const s = recordRoll(recordRoll(recordRoll(fresh(), 'p0', [3, 3]), 'p1', [2, 5]), 'p0', [1, 2]);
  expect([rollsThisTurn(s, 'p0'), rollsThisTurn(s, 'p1'), rollsThisTurn(s, 'p2')]).toEqual([[[3, 3], [1, 2]], [[2, 5]], []]);
  expect(s.data[TURN_ROLLS_KEY]).toEqual({ p0: [[3, 3], [1, 2]], p1: [[2, 5]] });
});
it('forgets the rolls with the turn log, and adds no key a state never had', () => {
  const rolled = recordRoll(fresh(), 'p0', [3, 3]);
  expect(rollsThisTurn(clearTurnLog(rolled), 'p0')).toEqual([]);
  expect(rollsThisTurn(chooseNext(rolled, 'p1'), 'p0')).toEqual([]);
  expect(clearTurnLog(recordAction(fresh(), 'p0', 'roll the dice')).data).not.toHaveProperty(TURN_ROLLS_KEY);
});
```

In `library/board-phrases.test.ts`, add a `doubles` describe.
- **Helpers.** `rolledBy(seat, faces, s = fixtureBoardState())` runs the effect `roll the dice` with subject `seat` on `queueRoll(s, faces)`, and `holds(text, seat, s)` runs a condition.
- **Turn memory.**
  - `rolledBy('p0', [3, 3])` gives `rollsThisTurn(s, 'p0')` of `[[3, 3]]`.
  - Rolling with no subject adds no `TURN_ROLLS_KEY`.
- **The last roll and the count.** After `[3, 3]` then `[1, 2]` by p0, these give `[false, true, true, false, true]`, in order:
  - `they rolled a double`;
  - `they did not roll a double`;
  - `they have rolled 1 double this turn`;
  - `they have rolled 2 doubles this turn`;
  - `they have rolled fewer than 2 doubles this turn`.
- **No roll yet.** `they rolled a double` is false on a fresh state.
- **`isDouble`.** It gives `true` for `[4, 4]`, and `false` for `[4]` and for `[4, 4, 4]`.
- **Review Focus:**

```ts
it("never counts another seat's double, or one from a turn that has passed", () => {
  const s = rolledBy('p0', [3, 3]);
  expect([holds('they rolled a double', 'p0', s), holds('they rolled a double', 'p1', s)]).toEqual([true, false]);
  const passed = chooseNext(s, 'p1');
  expect(latestRoll(passed)).toEqual([3, 3]);
  expect([holds('they rolled a double', 'p1', passed), holds('they have rolled 0 doubles this turn', 'p1', passed), holds('they rolled a double', 'p0', passed)])
    .toEqual([false, true, false]);
});
```

- **Who.** With p1 and p2 each set to `[[1, 1], [2, 2], [3, 3]]` (seats p0–p2) and p2 then out, `a player has rolled 3 doubles this turn` gives `['p1']`.
- **Given.** In the `example phrases` describe, add `ROLLING = { ...ROLL, effects: [{ kind: 'effect', phrase: 'roll the dice', args: [], line: 1, text: 'Roll the dice' }] }` and a phase with `[BUY, ROLLING, END]`.
  - `p0 has rolled 2 doubles this turn` gives `rollsThisTurn` of `[[1, 1], [1, 1]]` and `data[TURN_KEY]` of `{ p0: ['roll the dice'] }`.
  - The existing `given` helper, whose ROLL has no effects, throws `No button in this phase rolls the dice.` for `p0 has rolled 1 double this turn`.
  - `lib.get('given', '{player} has rolled {int} double(s) this turn')` matches `{ needsDice: true, needsTwoDice: true }`.

In `compile-phase.test.ts`, in the `TINY_BOARD_HEAD` describe:

```ts
it('refuses a double in a game without exactly two dice, on the line that says it', () => {
  const withDice = (dice: string, lines: string[]) =>
    compileGame(`${TINY_BOARD_HEAD.replace('  There are two six-sided dice.', dice)}\n${lines.map((l) => `  ${l}`).join('\n')}`, lib)
      .diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message]);
  const lines = ['A player may roll the dice.', '  Only if they rolled a double.', 'When a player has rolled 3 doubles this turn:', '  They are out.'];
  for (const dice of ['  There is one six-sided die.', '  There are three six-sided dice.']) {
    expect(withDice(dice, lines), dice).toEqual([[19, 'A double needs exactly two dice.'], [20, 'A double needs exactly two dice.']]);
  }
  expect(withDice('  There are two six-sided dice.', lines)).toEqual([]);
});
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board-state.test.ts src/engine/core/lang/library/board-phrases.test.ts src/engine/core/lang/compile-phase.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the three files, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit** `feat(lang): the dice faces of each roll this turn, doubles, and the two-dice check`

---

### Task 4: Slice 2 leftovers

**Files:**
- Modify: `src/engine/core/lang/refs.ts` (`ATTRIBUTE`)
- Modify: `src/engine/core/lang/library/fact-phrases.ts`
- Modify: `src/engine/core/lang/compile-phase.ts` (`otherPick`, `compileAction`)
- Test: `src/engine/core/lang/refs.test.ts`, `src/engine/core/lang/library/fact-phrases.test.ts`, `src/engine/core/lang/compile-phase.test.ts`

**Interfaces:**
- **`{attribute}` also reads singulars.** It also reads each attribute's `singularForms`, which resolve to the attribute: "charge" → `'charges'`.
- **New phrases in `fact-phrases.ts`:**
  - Effect `'it gains {int} {attribute}'` (needsCard) and effect `'each {cardflag} card in {zone} gains {int} {attribute}'`.
    - Both add n to the number through `changeCard`, so faces refresh.
    - A declared count the card was never given counts from 0 (`cardAttribute`).
    - A card whose value isn't a number is left as it is, as `loses` does.
  - Given `'{card} in {zone} has {int} {attribute}'` sets the number on the first matching card of the zone. With no such card it throws RuleError `There is no Archer in p1's camp.` (the file's `noCardIn` wording).
- **`cardInZoneHasExpected` says the count with `counted`:** `to have 1 charge`.
- **`otherPick(written: string, vocab: Vocab): { written: string | null } | null`.**
  - It is null exactly as today: no pick word, or words that don't start with a kind of space.
  - Otherwise the line is an error, and `written` is a suggestion only when the result is a bare kind. That means the words after the kind, plus "they own" added for "one of their", are nothing or exactly "they own".
  - Messages: `Write “${written}” so the player picks one.`, or with no suggestion `Write “on a …” so the player picks one.`

- [ ] **Step 1: Write the failing tests.**
  - **`refs.test.ts`.** With `vocabFrom({ maxPlayers: 2, facts: [{ name: 'charges', on: 'card', kind: 'number' }] })`, `parseParam('attribute', 'charge', v)` gives `{ value: 'charges' }`, and `'charges'` gives the same.
  - **`fact-phrases.test.ts`,** in `facts on cards`, add a `raising a number a card has` describe on `charged = { ...creatures, facts: [...creatures.facts, { name: 'charges', on: 'card', kind: 'number' }] }`:
    - `it gains 1 charge` about c0 gives `charges` 1 and `faceKey === textFaceKey({ name: 'Knight', health: 3, charges: 1 })`. Then `it gains 2 charges` gives 3.
    - `each poisoned card in their camp gains 1 health` (p0) gives `healthOf(s, 'c0', 'c1', 'c6', 'c2')` of `[3, 3, 0, 3]` and c1's face `faceOf('Archer', 3, true)`.
    - `each poisoned card in their camp loses 1 charge` (p0) reads, and leaves c1's `charges` at 0.
    - The Given `the Knight in p1's camp has 2 charges` gives c2 `charges` 2.
    - The Expect `the Knight in p1's camp has 1 charge` then says `Expected the Knight in p1's camp to have 1 charge, but it has 2.`
    - The Given `the Archer in p1's camp has 2 charges` throws `There is no Archer in p1's camp.`
  - **`compile-phase.test.ts`,** in the `BUILDING_HEAD` describe:
    - Remove the two orange lines from "tells the designer to write “on a …” …".
    - Add:

```ts
it('suggests no wording when the words after the pick are more than a kind of space, and still makes no button', () => {
  for (const line of ['build a house on any orange street they own', 'build a house on one of their orange streets', 'build a house on any street with houses']) {
    const built = phase([`A player may ${line}.`, '  Then:', '    It gets a house from the bank.']);
    expect(problems(built).map((d) => [d.line, d.message]), line).toEqual([[20, 'Write “on a …” so the player picks one.']]);
    expect(built.game, line).toBeUndefined();
  }
});
```

- [ ] **Step 2: Run** the three files. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the files, then `bun run test` and `bun run typecheck`. Venom still passes its 7 examples.
- [ ] **Step 5: Commit** `fix(lang): slice 2 leftovers: raising a card's number, singular attributes, and only wordings the language takes suggested`

---

### Task 5: Seat views show every player's facts

**Files:**
- Modify: `src/engine/core/lang/board-view.ts`
- Modify: `src/pages/designer/board-parts.test.tsx` (its `board()` fixture gains `playerFacts: {}`, which typecheck needs)
- Test: `src/engine/core/lang/board-view.test.ts`

**Interfaces:**
- **`BoardView.playerFacts: { [seat: string]: { [fact: string]: number | boolean } }`.**
  - It has one entry for every seat of the game, `{}` when nothing is set.
  - It holds that seat's player facts that are set: flags that are true and numbers other than 0, in declared order.
  - Player facts are public, so every seat sees all of them.
- **`readSeatExtras`** requires `playerFacts`: a map of maps whose values are numbers or booleans.

- [ ] **Step 1: Write the failing tests** in `board-view.test.ts`. Use `JAILING`, which is `TINY_BOARD` with `  Players can be in jail.` and `  Players can have jail turns and a crown.` after the dice line.
  - Arrange this state with `setPlayerFact` on `withBoardData(initialState(g, 1), g, ['p0', 'p1'])`:
    - p0 is in jail with 1 jail turn;
    - p1 has 0 jail turns and its crown flag is `false`.
  - For both seats, `board!.playerFacts` equals `{ p0: { 'in jail': true, 'jail turns': 1 }, p1: {} }`.
  - `readSeatExtras(JSON.parse(JSON.stringify(extras)))` equals `extras`.
  - It gives `null` when `playerFacts` is `{ p0: { 'in jail': 'yes' } }`, and when `playerFacts` is missing.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit** `feat(lang): seat views show every player's facts`

---

### Task 6: Rent Day, slice 3

**Files:**
- Modify: `src/games/rent-day.rules`
- Modify: `src/games/rent-day.test.ts`
- Modify: `src/pages/designer/playtest.test.tsx` and `src/pages/designer/designer-page.test.tsx` (they read Rent Day's hint, a reason and its example count)

**Interfaces:**
- Consumes everything above: `rollsThisTurn` and `isDouble` (Task 3), `playerFact` (`board-state.ts`).
- **Move types:**
  - `'roll the dice'`, `'pay to leave jail'`, `'roll for a double'`;
  - `'buy the space they are on'`, `'build a house on a street they own'` (with `target`), `'end their turn'`.
- **Board numbers** (from the table): Go 0, Ash Street 6, Cedar Avenue 9, Jail 10, Quay Street 13, Harbour Way 14, Rose Lane 16, Bell Square 24, Go To Jail 30.

- [ ] **Step 1: Under `Board:`,** after `The bank has 32 houses and 12 hotels.`, add:

```text
  Players can be in jail.
  Players can have jail turns.
```

- [ ] **Step 2: In `Phase: playing`:**
  - Replace the hint with `Hint: Roll the dice, then buy, build, or end your turn. A double rolls again.`
  - Replace the roll button with the one below, and add the two jail buttons right after it.
  - Keep the buy and build buttons as they are.
  - Replace the end-turn button, and add the three rules right after it, before `When a piece passes Go:`. The rest is unchanged.

```text
  A player may roll the dice.
    Only if they are not in jail.
    Only if they have not rolled for a double this turn.
    Only if one of:
      they have not rolled this turn
      they rolled a double
    Then:
      Roll the dice.
      If they have rolled fewer than 3 doubles this turn, their piece moves forward by the roll.
  A player may pay to leave jail.
    Only if they are in jail.
    Only if they have not rolled this turn.
    Only if they have at least 50 money.
    Then:
      They pay 50.
      They are not in jail.
      Their jail turns go back to 0.
  A player may roll for a double.
    Only if they are in jail.
    Only if they have not rolled this turn.
    Then:
      Roll the dice.
      If they rolled a double, they are not in jail.
      If they are in jail, they gain 1 jail turn.
      If they are not in jail, their jail turns go back to 0.
      If they are not in jail, their piece moves forward by the roll.
```

```text
  A player may end their turn.
    Only if they have rolled this turn.
    Only if one of:
      they did not roll a double
      they are in jail
      they have rolled for a double this turn
  When a player has rolled 3 doubles this turn:
    Only if they are not in jail.
    Their piece goes straight to Jail.
    They are in jail.
  When a player lands on a go to jail space:
    Their piece goes straight to Jail.
    They are in jail.
  When a player has 3 jail turns:
    They pay 50.
    They are not in jail.
    Their jail turns go back to 0.
    Their piece moves forward by the roll.
```

- [ ] **Step 3: Change the reason** of the existing example `you cannot roll twice in one turn` to `"they have not rolled this turn or they rolled a double"`. Every other existing example stays as it is.
- [ ] **Step 4: Append these 14 examples** after the existing 31, for 45 in all:

```text
Example: a double rolls again
  Given p0 is on Go
  And the next roll is 3 and 3
  And the roll after that is 1 and 2
  When p0 rolls the dice
  Then p0 is on Ash Street
  When p0 rolls the dice
  Then it is accepted
  And p0 is on Cedar Avenue

Example: you cannot end your turn on a double
  Given p0 is on Go
  And the next roll is 3 and 3
  When p0 rolls the dice
  And p0 ends their turn
  Then it is rejected because "they did not roll a double or they are in jail or they have rolled for a double this turn"

Example: a third double sends you to jail
  Given p0 is on Go
  And p0 has rolled 2 doubles this turn
  And the next roll is 4 and 4
  When p0 rolls the dice
  Then p0 is on Jail
  And p0 is in jail
  And p0 has 1500 money

Example: Go To Jail sends you to jail without passing Go
  Given p0 is on Bell Square
  And the next roll is 2 and 4
  When p0 rolls the dice
  Then p0 is on Jail
  And p0 is in jail
  And p0 has 1500 money

Example: in jail you cannot roll the dice
  Given p0 is on Jail
  And p0 is in jail
  When p0 rolls the dice
  Then it is rejected because "they are not in jail"

Example: paying to leave jail
  Given p0 is on Jail
  And p0 is in jail
  When p0 pays to leave jail
  Then it is accepted
  And p0 is not in jail
  And p0 has 1450 money

Example: a double gets you out of jail
  Given p0 is on Jail
  And p0 is in jail
  And the next roll is 2 and 2
  When p0 rolls for a double
  Then it is accepted
  And p0 is not in jail
  And p0 is on Harbour Way

Example: leaving jail by a double does not roll again
  Given p0 is on Jail
  And p0 is in jail
  And the next roll is 2 and 2
  When p0 rolls for a double
  And p0 rolls the dice
  Then it is rejected because "they have not rolled for a double this turn"

Example: a failed roll keeps you in jail
  Given p0 is on Jail
  And p0 is in jail
  And the next roll is 1 and 2
  When p0 rolls for a double
  Then p0 is in jail
  And p0 has 1 jail turn
  And p0 is on Jail

Example: the third failed roll pays and moves
  Given p0 is on Jail
  And p0 is in jail
  And p0 has 2 jail turns
  And the next roll is 1 and 2
  When p0 rolls for a double
  Then p0 is not in jail
  And p0 has 1450 money
  And p0 is on Quay Street
  And p0 has 0 jail turns

Example: landing on Jail is just visiting
  Given p0 is on Ash Street
  And the next roll is 1 and 3
  When p0 rolls the dice
  Then p0 is on Jail
  And p0 is not in jail

Example: a double that lands on Go To Jail still ends the turn
  Given p0 is on Bell Square
  And the next roll is 3 and 3
  When p0 rolls the dice
  And p0 ends their turn
  Then it is accepted
  And it is p1's turn

Example: one house raises the rent
  Given p1 owns Rose Lane
  And p1 owns Lily Lane
  And p1 owns Iris Road
  And Rose Lane has 1 house
  And Lily Lane has 1 house
  And Iris Road has 1 house
  And p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 has 1430 money
  And p1 has 1570 money

Example: four houses raise the rent
  Given p1 owns Rose Lane
  And p1 owns Lily Lane
  And p1 owns Iris Road
  And Rose Lane has 4 houses
  And Lily Lane has 4 houses
  And Iris Road has 4 houses
  And p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 has 750 money
  And p1 has 2250 money
```

- [ ] **Step 5: Extend `rent-day.test.ts`.**
  - **Examples:** `results` has length 45, and all pass.
  - **Constants:** `PAY = 'pay to leave jail'`, `ROLL_FOR_DOUBLE = 'roll for a double'`, `JAIL = 10`, `GO_TO_JAIL = 30` and `FINE = 50`.
  - **The auto-player (`playTurn`),** stopping as soon as the turn isn't theirs or the game is over:
    1. An even seat (p0, p2, …) pays whenever it may press PAY. An odd seat never pays, so it rolls for a double and sometimes reaches the third failed roll. Every jail path then comes up in the 2-player games.
    2. If it may press ROLL_FOR_DOUBLE, it presses it, then buys if allowed.
    3. While it may press ROLL, it rolls, then buys if allowed. Doubles roll again, and the third double ends this.
    4. It builds as today, then ends its turn.
  - **`keepsTheRules`, rolls.** Each case checks money for every seat, and pieces.
    - **ROLL.**
      - If it was the third double this turn (`rollsThisTurn(after, by).filter(isDouble).length === 3`): nobody's money changes, the piece is on JAIL, and the player is in jail.
      - Otherwise it is today's walk (salary, tax, rent read through `runtime.columnValue`). A landing on GO_TO_JAIL leaves the piece on JAIL with the player in jail, and pays nothing.
    - **ROLL_FOR_DOUBLE.** Before it, the player is in jail on JAIL.
      - A double frees them, and they walk from JAIL as a roll does, paying rent but no fine.
      - Not a double with 2 jail turns before: the walk from JAIL, plus a fine of 50 to the bank (`salary - tax - rent - fine` for the mover).
      - Otherwise: no money moves, the piece stays on JAIL, and jail turns go up by 1.
  - **`keepsTheRules`, other moves.**
    - **PAY:** the mover loses 50, nobody gains, and they are no longer in jail with 0 jail turns.
    - **Every move,** for each seat still in:
      - in jail ⇒ its piece is on JAIL;
      - not in jail ⇒ 0 jail turns (null counts as 0);
      - never more than 2 jail turns.
    - The bank and out-player checks stay.
  - **2-player ending.** The test stays: at least 9 of seeds 1 to 10 reach a winner within 3000 turns, naming any seed that doesn't. It also tallies across the ten games, and each tally must be above 0:
    - sent to jail by a third double;
    - sent to jail by landing on Go To Jail;
    - paid to leave;
    - freed by a double;
    - a third failed roll (a ROLL_FOR_DOUBLE that is not a double, with 2 jail turns before).
  - **4 and 8 players with full sets:** unchanged, seeds 1, 2 and 3 within 5000 turns. If a seed doesn't finish, try the next seed and say so in the commit. Don't raise the cap past 20000.
- [ ] **Step 6: Update the page tests** that read Rent Day:
  - `playtest.test.tsx`:
    - the hint becomes `Roll the dice, then buy, build, or end your turn. A double rolls again.`;
    - after p0's first roll (seed 1 rolls 2 and 4, not a double), p0's roll button title becomes `they have not rolled this turn or they rolled a double`.
  - `designer-page.test.tsx`: `45 of 45 examples pass`, and the test name says 45.
- [ ] **Step 7: Run** `bunx vitest run src/games/rent-day.test.ts src/pages/designer`. Fix any failure in the phrases, not in the example numbers: the numbers come from the board table above.
- [ ] **Step 8: Run** `bun run test` and `bun run typecheck`.
- [ ] **Step 9: Commit** `feat(games): Rent Day slice 3: doubles roll again, three doubles or Go To Jail send you to jail, and three ways out`

---

### Task 7: The playtest: who is in jail, and the jail buttons; README

**Files:**
- Modify: `src/pages/designer/board-grid.tsx`, `src/pages/designer/board-controls.tsx`, `README.md`
- Test: `src/pages/designer/board-parts.test.tsx`, `src/pages/designer/playtest.test.tsx`

**Interfaces:**
- Consumes `BoardView.playerFacts` (Task 5).
- **`export function factWords(facts: { [fact: string]: number | boolean }): string[]`** in `board-grid.tsx` gives the facts in the order given: true flags by name, numbers other than 0 as `counted(n, name)`. `board-controls.tsx` imports it.
- **Money line.**
  - A seat still in reads `p0 1,450 money · in jail · 1 jail turn`. Numbers keep today's thousands separator.
  - A seat that is out reads `p2 out`, with no facts.
- **Pieces.**
  - A piece's `title` is the seat, or `p0 (in jail, 1 jail turn)` when its player has facts set.
  - A piece whose player has any true flag gets `data-ring="true"` and a visible ring outside its usual outline. The look is the builder's.
  - Numbers alone never ring.
- **Space titles.** The title is `${name} — ${parts.join(', ')}`. The parts are the players on the space who have facts set (`p0 (in jail, 1 jail turn)`), then the space's facts, then its details. Players with no facts are not listed, so today's titles don't change.

- [ ] **Step 1: Write the failing tests.**

In `board-parts.test.tsx`:

```ts
describe('facts about players', () => {
  const jailed = board({ playerFacts: { p0: { 'in jail': true, 'jail turns': 1 }, p1: { 'jail turns': 2 } } });
  it('lists the players on a space with their facts, and rings a piece whose player has a yes/no fact set', () => {
    render(<BoardGrid board={jailed} />);
    expect(screen.getByTitle('Mill Lane — p0 (in jail, 1 jail turn), p1 (2 jail turns), price 60, rent 2')).toBeTruthy();
    expect(screen.getByTitle('p0 (in jail, 1 jail turn)').getAttribute('data-ring')).toBe('true');
    expect(screen.getByTitle('p1 (2 jail turns)').hasAttribute('data-ring')).toBe(false);
  });
  it('puts the facts after the money, and none after a seat that is out', () => {
    render(<MoneyLine board={{ ...jailed, out: ['p2'], playerFacts: { ...jailed.playerFacts, p2: { 'in jail': true } } }} />);
    expect(screen.getByText('p0 1,500 money · in jail · 1 jail turn')).toBeTruthy();
    expect(screen.getByText('p1 1,234,567 money · 2 jail turns')).toBeTruthy();
    expect(screen.getByText('p2 out')).toBeTruthy();
  });
});
```

In `playtest.test.tsx`:

```ts
describe('Playtest: a player in jail', () => {
  const JAIL = rentDay.board!.spaces.findIndex((space) => space.name === 'Jail');
  const jailed = setPlayerFact(setPlayerFact(
    placePiece(withBoardData(initialState(rentDay, SEED), rentDay, ['p0', 'p1']), 'p0', JAIL), 'p0', 'in jail', true), 'p0', 'jail turns', 1);

  it('shows who is in jail and the jail buttons, greyed with reasons, and paying sets them free', () => {
    mountRentDay({ players: 2, initial: jailed });
    expect(screen.getAllByText('p0 1,500 money · in jail · 1 jail turn')).toHaveLength(2);
    expect(screen.getAllByTitle('Jail — p0 (in jail, 1 jail turn), kind jail')).toHaveLength(2);
    expect(screen.getAllByTitle('p0 (in jail, 1 jail turn)').every((piece) => piece.getAttribute('data-ring') === 'true')).toBe(true);
    expect(rollButtons()[0].getAttribute('title')).toBe('they are not in jail');
    const [p0Pay, p1Pay] = screen.getAllByRole('button', { name: 'Pay to leave jail' });
    const [p0ForDouble] = screen.getAllByRole('button', { name: 'Roll for a double' });
    expect([p0Pay.getAttribute('aria-disabled'), p0ForDouble.getAttribute('aria-disabled')]).toEqual(['false', 'false']);
    expect(p1Pay.getAttribute('title')).toBe("It's p0's turn.");
    fireEvent.click(p0Pay);
    expect(screen.getAllByText('p0 1,450 money')).toHaveLength(2);
    expect(screen.queryAllByTitle(/^p0 \(/)).toHaveLength(0);
    expect(rollButtons()[0].getAttribute('aria-disabled')).toBe('false');
  });
});
```

- [ ] **Step 2: Run** `bunx vitest run src/pages/designer`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Check it in the browser.**
  - Run `bun run dev`, open `/#designer`, load Rent Day and press Play with 2 players.
  - Write a throwaway Playwright script (Playwright is installed globally) in your own scratchpad directory, never in the repo. It presses the current seat's enabled `Roll the dice`, then `End your turn`, until a money line shows `· in jail`. Then it checks three things and takes a screenshot:
    - the ring on that seat's piece;
    - `Roll the dice` greyed with `they are not in jail`;
    - `Pay to leave jail` and `Roll for a double` enabled for that seat and greyed for the others.
  - Look at the screenshot.
- [ ] **Step 5: Run** `bunx vitest run src/pages/designer`, then `bun run test` and `bun run typecheck`. Then run both checks below; the first prints only the `library/index.ts` import of `./rent-day`, and the second prints nothing:

```bash
grep -rniE '\b(jail|rent|houses?|hotels?|streets?|stations?|utilit(y|ies)|money)\b' src/engine/core/lang --include=*.ts | grep -v '\.test\.ts' | grep -v 'library/rent-day.ts' | grep -v 'lang/testing.ts'
grep -rniw jail src/pages/designer | grep -v '\.test\.'
```

- [ ] **Step 6: Update the README.**
  - Under *Designing a game*, change "with 31 examples" to "with 45 examples". Then add short notes on:
    - **facts about players:** `Players can be in jail.` and `Players can have jail turns.`, which are public and shown on the money line, with a ring on the board for a yes/no fact;
    - **doubles:** `they rolled a double`, `they have rolled 2 doubles this turn`, the two-dice rule, and `the roll after that is …` in examples;
    - **done-wordings:** "rolled" means any roll button, and "rolled for a double" names one.
  - In the roadmap, mark slice 3 (doubles and jail) shipped.
- [ ] **Step 7: Commit** `feat(designer): who is in jail on the money line and the board, and the jail buttons; docs: README`
