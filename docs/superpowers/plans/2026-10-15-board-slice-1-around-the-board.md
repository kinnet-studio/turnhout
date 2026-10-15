# Board Games Slice 1 (Around the Board) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A designer can write a Monopoly-like board game ("Rent Day") in the rules language and playtest it at 2 to 8 players: a loop of spaces, one piece per player, money, dice, buttons, "passes" and "lands on" rules, memory of this turn, owners that change, and players going out.

**Architecture:** Everything new lives in the language layer (`src/engine/core/lang/`). Board facts that change during play are kept in `GameState.data` under `lang:*` keys, the way `lang:winner` already is; the core `GameState`, `TurnState`, `runFlow` and `GameEngine` are not changed. A `Board:` section compiles to a `BoardSpec` on `CompiledGame`. Button actions compile to `DeclaredAction`s handled by a generic `declaredActionHandler`. "Passes"/"lands on" rules compile to `CompiledMoment`s that the piece-moving phrase announces through `PhraseEnv.announce` inside the move's apply, so replay reproduces them. `When a player …:` rules bind "they" through a new `who` phrase kind. Seat views gain an `extras` field filled by a lang callback, and the designer playtest draws the board, a money line and buttons in React.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19. No PixiJS work in this slice.

**Spec:** `docs/superpowers/specs/2026-10-15-board-slice-1-around-the-board-design.md` (part of `docs/superpowers/specs/2026-10-15-board-games-overview-design.md`).

## Global Constraints

- Branch `claude/peaceful-curie-rdfkow`. Install once with `bun install`. Single test file: `bunx vitest run <path>`; full suite: `bun run test`; types: `bun run typecheck`.
- **No new dependencies.**
- `src/engine/core/**` stays pure: no pixi/react/DOM imports, no `Math.random`/`Date.now`. Dice use `nextInt` from `src/engine/core/rng.ts` on `state.rng`.
- Everything in `CompiledGame` and every `lang:*` value in `GameState.data` is `Json`: declare shapes with `type` aliases, use `null` (never `undefined`) for absent values inside them.
- **Do not modify** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, or anything under `src/pages/hearts-demo/`.
- No Monopoly words (`rent`, `property`, `jail`, `money`) in engine or language code: phrase patterns use `{counter}` and `{spaceattr}` instead. Those words appear only in tests, test fixtures (`lang/testing.ts`), and `src/games/rent-day.rules`.
- Designer-facing text (diagnostics, rejection reasons, example results, the page) never contains engine vocabulary (`FlowDef`, `NamedRef`, `zoneId`, `lang:`) or stack traces.
- Existing behaviour unchanged: all 907 current tests keep passing; Hearts and Color Match compile with no diagnostics and pass their examples.
- Style: 2-space indent, single quotes, chainable `register*` phrase registrars, `m.foo as string` casts on move fields, comments that say why.
- Commit prefixes: `feat(lang):`, `feat(net):`, `feat(games):`, `feat(designer):`, `docs:`. TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.

## Review Focus

- **Space names written with other capitals or curly apostrophes** (`bishop’s row`, `ROSE LANE`) resolve to the same space as the table's `Bishop's Row`. Test in Task 2.
- **A pay line whose amount is missing or is text**, such as "They pay its rent" reached on Go or a `rent` cell holding `free`, gives a sentence naming the space ("Go has no rent.", "Mill Lane's rent isn't a number."), never `NaN` money. Test in Task 4.
- **A moment rule that keeps moving pieces** (a lands-on rule whose effect moves the piece again) ends with "It keeps moving pieces without stopping." on that rule's line, never a stack overflow. Test in Task 6.
- **Buttons after the game is over, or on a seat that is out**, are greyed with "The game is over." or "You're out of the game." and pressing one sends nothing. Tests in Task 8 and Task 10.
- **An example that fixes a roll with the wrong number of dice or an impossible face** ("the next roll is 3" with two dice, "7 and 1" on six-sided dice) fails on that Given line with a sentence, not later inside "Roll the dice". Test in Task 7.

---

### Task 1: Shared types, phrase kinds and the board state store

**Files:**
- Modify: `src/engine/core/lang/types.ts`
- Modify: `src/engine/core/lang/phrases.ts` (`emptyVocab`, `vocabFrom`, `PhraseLibrary` kinds and options, `stubParams`)
- Create: `src/engine/core/lang/board-state.ts`
- Modify: `src/engine/core/lang/zones.ts` (`chooseNext`)
- Modify: `src/engine/core/lang/testing.ts` (fixtures)
- Test: `src/engine/core/lang/board-state.test.ts`, `src/engine/core/lang/phrases.test.ts`

**Interfaces:**
- Produces (in `types.ts`):
  - `PhraseKind` gains `'board' | 'who' | 'moment'`.
  - `type SpaceSpec = { name: string; attrs: { [k: string]: Json } }`: `attrs` holds every column but `space`; blank cells are left out.
  - `type CounterSpec = { name: string; start: number; visibility: 'public' | 'owner' }`
  - `type BoardSpec = { spaces: SpaceSpec[]; pieces: { start: number } | null; counters: CounterSpec[]; dice: { count: number; sides: number } | null; payWith: string | null }`
  - `type BoardPart = { kind: 'loop'; spaces: SpaceSpec[] } | { kind: 'pieces'; start: number } | { kind: 'counter'; counter: CounterSpec } | { kind: 'dice'; count: number; sides: number } | { kind: 'pay-with'; counter: string }`
  - `type SpaceClass = { attribute: string; values: Json[] }`
  - `type DeclaredAction = { verb: string; words: string; label: string; conditions: CondGroup[]; effects: PhraseRef[]; line: number }`: `words` is the lowercase text after "a player may", for example `'roll the dice'`; `label` is the button text, for example `'Roll the dice'`.
  - `type CompiledMoment = { line: number; text: string; when: PhraseRef; conditions: CondGroup[]; effects: PhraseRef[] }`
  - `CompiledPhase` gains `actions: DeclaredAction[]; moments: CompiledMoment[]`; `CompiledGame` gains `board: BoardSpec | null`.
  - `Vocab` gains `spaces: string[]` (names in loop order, duplicates kept), `spaceAttributes: string[]`, `spaceValues: { attribute: string; value: string }[]` (the text cells, not the numbers), `counters: string[]`, `payWith: string | null`, `actions: { verb: string; words: string }[]`.
  - `type Subject = { player: PlayerId | null; space: number | null }`; `type Moment = { kind: 'pass' | 'land'; seat: PlayerId; space: number }`.
  - `PhraseEnv` gains `subject?: Subject` and `announce?: (state: GameState, moment: Moment) => GameState`.
  - `type WhoFn = (env: PhraseEnv, args: Json[]) => PlayerId[]`; `type MomentFn = (env: PhraseEnv, args: Json[], moment: Moment) => boolean`; `type BoardFn = (args: Json[], table: CardTable | null) => BoardPart`.
- Produces (in `phrases.ts`):
  - `type PhraseOpts = { needsMove?: boolean; needsPlayer?: boolean; needsSpace?: boolean; needsPayment?: boolean }`. `condition`, `effect` and `who` take `opts?: PhraseOpts`. New `board(p, fn: BoardFn)`, `who(p, fn: WhoFn, opts?)`, `moment(p, fn: MomentFn)`.
  - `get(kind, pattern)` returns `{ fn; needsMove; needsPlayer; needsSpace; needsPayment } | undefined`, with every flag a boolean.
  - `vocabFrom({ maxPlayers, zones?, cards?, phases?, verbs?, board?: BoardSpec | null, actions?: { verb: string; words: string }[] })` fills the new fields: `spaceAttributes` lists columns in order of first appearance, and `spaceValues` is unique `{ attribute, value }` pairs for string values.
  - `stubParams`: `'board'` → `` `${args}, table` ``; `'moment'` → `` `env, ${args}, moment` ``.
- Produces (in `board-state.ts`). Every function is pure and returns a new state:
  - Keys: `PIECES_KEY = 'lang:pieces'` (`{ [seat]: number }`, where a seat with no piece is absent), `OWNERS_KEY = 'lang:owners'` (`{ [spaceIndex]: seat }`), `COUNTERS_KEY = 'lang:counters'` (`{ [counter]: { [seat]: number } }`), `ROLL_KEY = 'lang:roll'` (`number[]`), `NEXT_ROLLS_KEY = 'lang:next-rolls'` (`number[][]`), `TURN_KEY = 'lang:turn'` (`{ seat: PlayerId; did: string[]; ended: boolean }`), `OUT_KEY = 'lang:out'` (`PlayerId[]`).
  - `withBoardData(state: GameState, game: CompiledGame, seats: PlayerId[]): GameState`: unchanged when `game.board` is null or `PIECES_KEY` is already set. Otherwise it sets pieces (every seat on `board.pieces.start`, or `{}` when there are no pieces), owners `{}`, counters at their start values, and out `[]`.
  - `pieceAt(state, seat): number | null`; `placePiece(state, seat, space: number | null): GameState`
  - `ownerOf(state, space: number): PlayerId | null`; `setOwner(state, space, seat: PlayerId | null): GameState`
  - `counterOf(state, counter: string, seat): number`: 0 when unset. `setCounter(state, counter, seat, value): GameState`; `addToCounter(state, counter, seat, delta): GameState`
  - `latestRoll(state): number[] | null`; `setRoll(state, faces: number[]): GameState`; `queueRoll(state, faces: number[]): GameState`; `takeQueuedRoll(state): { faces: number[] | null; state: GameState }`
  - `isOut(state, seat): boolean`; `markOut(state, seat): GameState`: appends to out and takes the piece off the board. `playersIn(state, seats): PlayerId[]`
  - `nextIn(state, seat, seats): PlayerId`: the next seat to the left that is still in; equal to `leftOf` when nobody is out. Throws `RuleError('No other player is still in.')` when there is none.
  - `didThisTurn(state, seat, verb): boolean`: true only when the log's `seat === seat`, `ended === false`, and `did` includes `verb`.
  - `recordAction(state, seat, verb, endsTurn: boolean): GameState`: starts a fresh log when the log is for another seat or has ended; appends `verb`; sets `ended = endsTurn`.
  - `endTurnLog(state): GameState`: sets `ended: true`; returns the same object when there is no log.
- `zones.ts` `chooseNext(state, seat)` also applies `endTurnLog` (card games never create the log, so their states are unchanged).
- `testing.ts`:
  - `fixtureGame` defaults `board: null`; `fixturePhase` defaults `actions: [], moments: []`.
  - `fixtureEnv` opts gain `subject?: Subject` and `announce?: PhraseEnv['announce']`.
  - `vocabFor` passes `board: game.board` and `actions` from every phase's `actions` (`{ verb, words }`).
  - New `FIXTURE_SPACES: SpaceSpec[]` (8 spaces, below).
  - New `fixtureBoardGame(over?: Partial<CompiledGame>): CompiledGame`: name `'Board Fixture'`, players 2 to 4, no zones or cards, board `{ spaces: FIXTURE_SPACES, pieces: { start: 0 }, counters: [{ name: 'money', start: 1500, visibility: 'public' }], dice: { count: 2, sides: 6 }, payWith: 'money' }`, no phases.
  - New `fixtureBoardState(game = fixtureBoardGame(), seats: PlayerId[] = ['p0', 'p1']): GameState`: `withBoardData(fixtureState([]), game, seats)` with `turn: { current: 'p0', phase: 'playing' }`.

```ts
export const FIXTURE_SPACES: SpaceSpec[] = [
  { name: 'Go', attrs: { kind: 'go' } },
  { name: 'Mill Lane', attrs: { kind: 'street', color: 'brown', price: 60, rent: 2 } },
  { name: 'Income Tax', attrs: { kind: 'tax', tax: 200 } },
  { name: 'North Station', attrs: { kind: 'station', price: 200, rent: 25 } },
  { name: 'Chance', attrs: { kind: 'chance' } },
  { name: 'Rose Lane', attrs: { kind: 'street', color: 'orange', price: 180, rent: 14 } },
  { name: 'Power Works', attrs: { kind: 'utility', price: 150 } },
  { name: 'Chance', attrs: { kind: 'chance' } },
];
```

- [ ] **Step 1: Write the failing tests** in `board-state.test.ts`

```ts
const seats = ['p0', 'p1', 'p2'];
const game = fixtureBoardGame();
const fresh = () => withBoardData(fixtureState([]), game, seats);

it('starts every piece on the start space and every counter at its start value', () => {
  const s = fresh();
  expect(seats.map((p) => pieceAt(s, p))).toEqual([0, 0, 0]);
  expect(counterOf(s, 'money', 'p2')).toBe(1500);
  expect(ownerOf(s, 5)).toBeNull();
  expect(playersIn(s, seats)).toEqual(seats);
});
it('leaves a state that already has board data, and a card game, alone', () => {
  const moved = placePiece(fresh(), 'p0', 3);
  expect(withBoardData(moved, game, seats)).toBe(moved);
  const cards = fixtureState([]);
  expect(withBoardData(cards, fixtureGame(), seats)).toBe(cards);
});
it('moves money between seats', () => {
  const s = addToCounter(addToCounter(fresh(), 'money', 'p0', -14), 'money', 'p1', 14);
  expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p1')]).toEqual([1486, 1514]);
});
it('takes a player out: no piece, skipped by nextIn', () => {
  const s = markOut(fresh(), 'p1');
  expect(isOut(s, 'p1')).toBe(true);
  expect(pieceAt(s, 'p1')).toBeNull();
  expect(nextIn(s, 'p0', seats)).toBe('p2');
  expect(nextIn(s, 'p2', seats)).toBe('p0');
  expect(playersIn(s, seats)).toEqual(['p0', 'p2']);
});
it('remembers actions for the current turn only', () => {
  let s = recordAction(fresh(), 'p0', 'roll', false);
  expect(didThisTurn(s, 'p0', 'roll')).toBe(true);
  expect(didThisTurn(s, 'p1', 'roll')).toBe(false);
  s = recordAction(s, 'p0', 'end', true);
  expect(didThisTurn(s, 'p0', 'roll')).toBe(false);
  s = recordAction(s, 'p0', 'roll', false);
  expect((s.data[TURN_KEY] as { did: string[] }).did).toEqual(['roll']);
});
it('chooseNext ends the turn log, and leaves card games without one', () => {
  const s = chooseNext(recordAction(fresh(), 'p0', 'roll', false), 'p0');
  expect(didThisTurn(s, 'p0', 'roll')).toBe(false);
  expect(chooseNext(fixtureState([]), 'p0').data).toEqual({});
});
it('queues rolls for examples, first in first out', () => {
  const s = queueRoll(queueRoll(fresh(), [3, 4]), [1, 1]);
  const first = takeQueuedRoll(s);
  expect(first.faces).toEqual([3, 4]);
  expect(takeQueuedRoll(first.state).faces).toEqual([1, 1]);
  expect(takeQueuedRoll(fresh()).faces).toBeNull();
});
```

In `phrases.test.ts`, add:

```ts
it('builds space, counter and action words from a board game', () => {
  const v = vocabFrom({ maxPlayers: 2, board: fixtureBoardGame().board, actions: [{ verb: 'roll', words: 'roll the dice' }] });
  expect(v.spaces).toHaveLength(8);
  expect(v.spaceAttributes).toEqual(['kind', 'color', 'price', 'rent', 'tax']);
  expect(v.spaceValues).toContainEqual({ attribute: 'kind', value: 'street' });
  expect(v.spaceValues.some((x) => x.attribute === 'price')).toBe(false);
  expect(v.counters).toEqual(['money']);
  expect(v.payWith).toBe('money');
  expect(v.actions).toEqual([{ verb: 'roll', words: 'roll the dice' }]);
});
it('reports every flag a phrase was registered with', () => {
  const lib = new PhraseLibrary(STATIC_TYPES).effect('they rest', (env) => env.state, { needsPlayer: true });
  expect(lib.get('effect', 'they rest')).toMatchObject({ needsMove: false, needsPlayer: true, needsSpace: false, needsPayment: false });
});
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board-state.test.ts src/engine/core/lang/phrases.test.ts`. Expected: FAIL (module `./board-state` not found; `vocabFrom` has no `spaces`).
- [ ] **Step 3: Implement** the types, `board-state.ts`, the `PhraseLibrary` additions, `vocabFrom`/`emptyVocab`, `chooseNext` and the fixtures as listed under Interfaces.
- [ ] **Step 4: Run** the two test files (PASS), then `bun run test` and `bun run typecheck`. Every existing `CompiledGame`/`CompiledPhase` literal needs the new fields; `fixtureGame`/`fixturePhase` cover the tests, and `compile.ts`/`compile-phase.ts` get `board: null` / `actions: [], moments: []` for now.
- [ ] **Step 5: Commit** `feat(lang): board state store, board phrase kinds and fixtures`

---

### Task 2: Parameter types for spaces, counters, actions and dice counts

**Files:**
- Modify: `src/engine/core/lang/refs.ts`
- Modify: `src/engine/core/lang/phrases.ts` (`STATIC_TYPES`)
- Test: `src/engine/core/lang/refs.test.ts`, `src/engine/core/lang/phrases.test.ts`

**Interfaces:**
- Consumes: `Vocab` fields from Task 1.
- Produces:
  - `participle(verb: string): string`. Irregulars: buy→bought, draw→drawn, pay→paid, build→built, sell→sold, take→taken, give→given, throw→thrown, put→put, go→gone, make→made, get→got, win→won, lose→lost, hold→held, keep→kept, leave→left, bid→bid, deal→dealt, spend→spent, choose→chosen. Regular forms: a final `e` adds `d`, a consonant + `y` becomes `ied`, and anything else adds `ed`.
  - `thirdPersonWords(words: string): string`: `'end their turn'` → `'ends their turn'`, using `thirdPerson` on the first word only.
  - `VOCAB_TYPES` gains:
    - `{space}`: label `'[space]'`, stubOrder 3. Resolves to the space's index. A name used by more than one space is an error: `` `There are ${n} spaces called “${name}”, so this can't tell which one.` `` Loose: "There is no space called “…”." with suggestions from the unique names.
    - `{spaceclass}`: label `'[kind of space]'`. Source is `(a|an) V( or V)*( space)?` over `spaceValues`, and it resolves to a `SpaceClass`. A value that belongs to two columns gives `` `“${v}” could be ${joinOr(columns)}.` `` Values from different columns give `` `“${text}” mixes ${joinOr(columns)}.` ``
    - `{spaceattr}`: label `'[space detail]'`, a word type over `spaceAttributes`. Loose: "There is no space detail called “…”."
    - `{counter}`: label `'[counter]'`, a word type over `counters`. Loose: "There is no counter called “…”."
    - `{action}`: label `'[action]'`. Source is the `thirdPersonWords` of every `vocab.actions` entry, and it resolves to the verb.
    - `{done}`: label `'[action done]'`, a word type of `participle(verb)` → verb over `vocab.actions`.
  - `STATIC_TYPES` gains `{count}`: label `'[number]'`, source `\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve`, resolving to a number.

- [ ] **Step 1: Write the failing tests** in `refs.test.ts`, using `const v = vocabFrom({ maxPlayers: 2, board: { ...fixtureBoardGame().board!, spaces: [...FIXTURE_SPACES, { name: "Bishop's Row", attrs: { kind: 'street', color: 'green', price: 300, rent: 26 } }] }, actions: [{ verb: 'roll', words: 'roll the dice' }, { verb: 'end', words: 'end their turn' }, { verb: 'buy', words: 'buy the space they are on' }] })`:

```ts
it('reads a space by name, whatever the capitals or apostrophes', () => {
  expect(parseParam('space', 'Rose Lane', v)).toEqual({ value: 5 });
  expect(parseParam('space', 'ROSE LANE', v)).toEqual({ value: 5 });
  expect(parseParam('space', 'bishop’s row', v)).toEqual({ value: 8 });
});
it('refuses a name two spaces share', () => {
  expect(parseParam('space', 'Chance', v)).toEqual({ error: 'There are 2 spaces called “Chance”, so this can\'t tell which one.' });
});
it('reads kinds of space from one column', () => {
  expect(parseParam('spaceclass', 'a street or station', v)).toEqual({ value: { attribute: 'kind', values: ['street', 'station'] } });
  expect(parseParam('spaceclass', 'a tax space', v)).toEqual({ value: { attribute: 'kind', values: ['tax'] } });
  expect(parseParam('spaceclass', 'a street or brown', v)).toEqual({ error: '“a street or brown” mixes kind and color.' });
});
it('reads counters, space details, actions and what was done', () => {
  expect(parseParam('counter', 'money', v)).toEqual({ value: 'money' });
  expect(parseParam('spaceattr', 'rent', v)).toEqual({ value: 'rent' });
  expect(parseParam('action', 'ends their turn', v)).toEqual({ value: 'end' });
  expect(parseParam('done', 'rolled', v)).toEqual({ value: 'roll' });
  expect(parseParam('done', 'bought', v)).toEqual({ value: 'buy' });
});
it('makes participles', () => {
  expect(['roll', 'end', 'buy', 'draw', 'trade', 'bury', 'play'].map(participle))
    .toEqual(['rolled', 'ended', 'bought', 'drawn', 'traded', 'buried', 'played']);
});
```

In `phrases.test.ts`: a library with `.effect('there are {count} dice', fn)` matches `'There are two dice'` with args `[2]` and `'There are 3 dice'` with args `[3]`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/refs.test.ts src/engine/core/lang/phrases.test.ts`. Expected: FAIL (`unknown parameter type {space}`).
- [ ] **Step 3: Implement** the types in `refs.ts` (reuse `wordType`, `anyOf`, `canon`, `bounded`, `looseAs`, `misnamedWord`, `joinOr`), `participle`, `thirdPersonWords`, and `{count}`.
- [ ] **Step 4: Run** the tests (PASS), then `bun run test`.
- [ ] **Step 5: Commit** `feat(lang): space, counter, action and dice-count parameter types`

---

### Task 3: The Board: section

**Files:**
- Create: `src/engine/core/lang/board.ts` (`readSpaceTable`)
- Create: `src/engine/core/lang/library/board-phrases.ts` (`registerBoardPhrases`, board-kind phrases only in this task)
- Modify: `src/engine/core/lang/library/index.ts` (add `registerBoardPhrases` to `REGISTRARS` after `registerFlowPhrases`)
- Modify: `src/engine/core/lang/compile.ts`
- Test: `src/engine/core/lang/board.test.ts`, `src/engine/core/lang/compile.test.ts`

**Interfaces:**
- Consumes: `BoardPart`, `BoardSpec`, `{space}`, `{counter}`, `{count}`.
- Produces:
  - `readSpaceTable(table: CardTable): SpaceSpec[]`. The `space` column (any case) is required, and column names are lowercased and trimmed. A blank cell is left out of `attrs`, a whole number becomes a number, and other text is kept as written (trimmed). Errors are `RuleError`s with the row's line:
    - "Add a “space” column naming each space."
    - "Every space needs a name."
    - "A space table can't use ranges like “1 to 9”; give each space its own row."
    - "A board needs at least 4 spaces."
    - `` `A board can have at most ${MAX_SPACES} spaces.` `` with `MAX_SPACES = 200`.
  - Board phrases (kind `board`):
    - `'the board is a loop of spaces, starting at {name}'`: needs the table, otherwise "Add a table of spaces under this line.". The first row's name must equal `{name}` (compared with `canon`), otherwise `` `The first space in the table is “${first}”, but this line says the board starts at “${name}”.` ``
    - `'each player has a piece that starts on {space}'`
    - `'each player has {int} {name} that {visibility}'`: `secret` gives "A number a player has can be seen by everyone or only by them."
    - `'players pay with {counter}'`
    - `'there are {count} {count}-sided dice'` and `'there is one {count}-sided die'`: the count must be 1 to 10 and the sides 2 to 100, otherwise "Dice need 1 to 10 dice of 2 to 100 sides."
  - `compile.ts`:
    - `SECTION` and `BLOCK_SECTIONS` gain `board`, and `UNKNOWN_SECTION` lists Board.
    - "Add a Cards: section." and "Add a Table: section." are only reported when there is no `Board:` section.
    - New `compileBoard(sections, maxPlayers, stage): BoardSpec | null` reads lines in written order. Each line is matched as kind `board` (trailing `:` dropped, its table passed) with a vocab built from the parts above it. Duplicates are errors on the later line:
      - "There is already a board line above."
      - "Pieces are already described above."
      - "The dice are already described above."
      - `` `There are two counters called “${name}”.` ``
      - "There is already a “Players pay with …” line above."
    - The full `vocabFrom` call gains `board`. `holdBack` stages become `[of('players'), of('board'), of('table'), of('cards')]`. The game gets `board`.

- [ ] **Step 1: Write the failing tests.** In `board.test.ts`, `readSpaceTable` on a 4-row table returns `[{ name: 'Go', attrs: { kind: 'go' } }, { name: 'Mill Lane', attrs: { kind: 'street', color: 'brown', price: 60, rent: 2 } }, …]`. It throws each error above for a missing column, a blank name, a `1 to 9` cell and 3 rows. In `compile.test.ts`, add a `TINY_BOARD_HEAD` constant in the test:

```ts
const TINY_BOARD_HEAD = [
  'Game: Tiny Board', 'Players: 2 to 4', '', 'Board:',
  '  The board is a loop of spaces, starting at Go:',
  '    | space      | kind   | color  | price | rent | tax |',
  '    | Go         | go     |        |       |      |     |',
  '    | Mill Lane  | street | brown  | 60    | 2    |     |',
  '    | Income Tax | tax    |        |       |      | 200 |',
  '    | Rose Lane  | street | orange | 180   | 14   |     |',
  '  Each player has a piece that starts on Go.',
  '  Each player has 1500 money that everyone can see.',
  '  Players pay with money.',
  '  There are two six-sided dice.',
  '', 'Phase: playing', '  Players take turns.',
].join('\n');

it('compiles a Board: section', () => {
  const { game, diagnostics } = compileGame(TINY_BOARD_HEAD, createDefaultLibrary());
  expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(game!.board).toEqual({
    spaces: [
      { name: 'Go', attrs: { kind: 'go' } },
      { name: 'Mill Lane', attrs: { kind: 'street', color: 'brown', price: 60, rent: 2 } },
      { name: 'Income Tax', attrs: { kind: 'tax', tax: 200 } },
      { name: 'Rose Lane', attrs: { kind: 'street', color: 'orange', price: 180, rent: 14 } },
    ],
    pieces: { start: 0 }, counters: [{ name: 'money', start: 1500, visibility: 'public' }],
    dice: { count: 2, sides: 6 }, payWith: 'money',
  });
});
it('names a counter the board never declared', () => {
  const { diagnostics } = compileGame(TINY_BOARD_HEAD.replace('pay with money', 'pay with gold'), createDefaultLibrary());
  expect(diagnostics).toContainEqual(expect.objectContaining({ line: 13, message: 'There is no counter called “gold”.', suggestions: ['money'] }));
});
it('names a space the table never defined', () => {
  const { diagnostics } = compileGame(TINY_BOARD_HEAD.replace('starts on Go.', 'starts on Goo.'), createDefaultLibrary());
  expect(diagnostics).toContainEqual(expect.objectContaining({ line: 11, message: 'There is no space called “Goo”.', suggestions: ['Go'] }));
});
it('says when the loop line names another first space', () => {
  const { diagnostics } = compileGame(TINY_BOARD_HEAD.replace('starting at Go:', 'starting at Start:'), createDefaultLibrary());
  expect(diagnostics).toContainEqual(expect.objectContaining({ line: 5, message: 'The first space in the table is “Go”, but this line says the board starts at “Start”.' }));
});
it('reports a second dice line', () => {
  const { diagnostics } = compileGame(TINY_BOARD_HEAD.replace('six-sided dice.', 'six-sided dice.\n  There is one six-sided die.'), createDefaultLibrary());
  expect(diagnostics).toContainEqual(expect.objectContaining({ line: 15, message: 'The dice are already described above.' }));
});
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board.test.ts src/engine/core/lang/compile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `board.ts`, the board phrases, the library registration and the compiler changes.
- [ ] **Step 4: Run** the tests (PASS), then `bun run test` (Hearts and Color Match still compile with no diagnostics).
- [ ] **Step 5: Commit** `feat(lang): Board: section with a loop of spaces, pieces, counters and dice`

---

### Task 4: Board gameplay phrases

**Files:**
- Modify: `src/engine/core/lang/library/board-phrases.ts`
- Modify: `src/engine/core/lang/library/support.ts` (`theyOf`, `itOf`)
- Modify: `src/engine/core/lang/library/flow-phrases.ts` (`passesLeft` uses `nextIn`)
- Test: `src/engine/core/lang/library/board-phrases.test.ts`, `src/engine/core/lang/library/flow-phrases.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 3.
- Produces in `support.ts`:
  - `theyOf(env): PlayerId`, which is `env.subject?.player`. It throws a plain `Error` (a compiler bug) when there is none.
  - `itOf(env): number`, which is `env.subject?.space`, else the piece of `theyOf(env)`. It throws `RuleError('They have no piece on the board.')` when there is none.
- Produces in `board-phrases.ts`. Paying uses `env.game.board.payWith`, and the amount comes from the space's attribute. An absent attribute gives `` `${space} has no ${attr}.` `` and a non-number gives `` `${space}'s ${attr} isn't a number.` ``.
  - **Conditions:**
    - `'they have {done} this turn'` and `'they have not {done} this turn'` (needsPlayer)
    - `'it has a {spaceattr}'` and `'it has an {spaceattr}'` (needsSpace)
    - `'no one owns it'`, `'someone else owns it'` and `'they own it'` (needsSpace; the last also needsPlayer)
    - `'they have at least its {spaceattr} in {counter}'` (needsPlayer, needsSpace)
    - `'they have at least {int} {counter}'` (needsPlayer)
    - `'one player is left'`
  - **Who:** `'a player has less than {int} {counter}'` returns the seats still in, in seat order, that match.
  - **Moments:**
    - `'a piece passes {space}'` (`kind === 'pass'` and the space matches)
    - `'a player lands on {space}'`
    - `'a player lands on {spaceclass}'`
    - `'a player lands on {spaceclass} someone else owns'` (there is an owner and it is not `moment.seat`)
  - **Effects:**
    - `'roll the dice'`: with no dice, "This game has no dice. Add a line like “There are two six-sided dice.” under Board:". It uses a queued roll first, which does not advance `rng`; otherwise one `nextInt(rng, sides)` per die, with faces `value + 1`. Then `setRoll`.
    - `'their piece moves forward by the roll'` (needsPlayer): for each step 1..sum, place the piece on that space and `announce({ kind: 'pass', … })`; then `announce({ kind: 'land', … })` for the final space. Without a roll, "Nobody has rolled the dice yet." Without `env.announce`, a plain `Error`.
    - `'its player gets {int} {counter}'` and `'they get {int} {counter}'` (needsPlayer)
    - `'they pay its {spaceattr}'` and `'they pay its {spaceattr} to its owner'` (needsPlayer, needsSpace, needsPayment). With no owner, `` `No one owns ${space}.` ``
    - `'they pay {int} times the roll to its owner'` (needsPlayer, needsSpace, needsPayment)
    - `'they own it'` (needsPlayer, needsSpace)
    - `'they are out'` (needsPlayer): `markOut`; when they hold the turn, `chooseNext(state, nextIn(...))`.
    - `'their spaces go back to the bank'` (needsPlayer)
  - **Winner:** `'that player wins'`: the one player still in. Otherwise "More than one player is still in, so no one has won yet."
  - `flow-phrases.ts` `passesLeft` returns `nextIn(env.state, current, env.seats)`.

- [ ] **Step 1: Write the failing tests** in `board-phrases.test.ts`, with:

```ts
const lib = createDefaultLibrary();
// The phase's roll action gives `{done}` its word, "rolled".
const ROLL: DeclaredAction = { verb: 'roll', words: 'roll the dice', label: 'Roll the dice', conditions: [], effects: [], line: 1 };
const game = fixtureBoardGame({ phases: [fixturePhase('playing', [], { actions: [ROLL] })] });
const env = (state: GameState, over: Partial<Parameters<typeof fixtureEnv>[1]> = {}) => fixtureEnv(state, { game, seats: ['p0', 'p1', 'p2'], ...over });
const as = (player: string, space: number | null = null) => ({ subject: { player, space } });
```

```ts
it('rolls two six-sided dice from the rng, and the same rng rolls the same faces', () => {
  const s = runPhrase<GameState>(lib, 'effect', 'roll the dice', env(fixtureBoardState()));
  const faces = latestRoll(s)!;
  expect(faces).toHaveLength(2);
  expect(faces.every((f) => f >= 1 && f <= 6)).toBe(true);
  expect(s.rng.count).toBe(fixtureBoardState().rng.count + 2);
  expect(latestRoll(runPhrase<GameState>(lib, 'effect', 'roll the dice', env(fixtureBoardState())))).toEqual(faces);
});
it('uses a queued roll without touching the rng', () => {
  const start = queueRoll(fixtureBoardState(), [3, 4]);
  const s = runPhrase<GameState>(lib, 'effect', 'roll the dice', env(start));
  expect(latestRoll(s)).toEqual([3, 4]);
  expect(s.rng).toEqual(start.rng);
});
it('moves the piece, announcing each space passed, then the landing', () => {
  const seen: Moment[] = [];
  const announce = (s: GameState, m: Moment) => { seen.push(m); return s; };
  const start = setRoll(placePiece(fixtureBoardState(), 'p0', 6), [1, 2]);
  const s = runPhrase<GameState>(lib, 'effect', 'their piece moves forward by the roll', env(start, { ...as('p0'), announce }));
  expect(pieceAt(s, 'p0')).toBe(1);
  expect(seen).toEqual([
    { kind: 'pass', seat: 'p0', space: 7 }, { kind: 'pass', seat: 'p0', space: 0 },
    { kind: 'pass', seat: 'p0', space: 1 }, { kind: 'land', seat: 'p0', space: 1 },
  ]);
});
it('pays rent to the owner of the space they are on', () => {
  const start = setOwner(placePiece(fixtureBoardState(), 'p0', 5), 5, 'p1');
  const s = runPhrase<GameState>(lib, 'effect', 'they pay its rent to its owner', env(start, as('p0')));
  expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p1')]).toEqual([1486, 1514]);
});
it('pays 4 times the roll', () => {
  const start = setRoll(setOwner(placePiece(fixtureBoardState(), 'p0', 6), 6, 'p1'), [1, 2]);
  const s = runPhrase<GameState>(lib, 'effect', 'they pay 4 times the roll to its owner', env(start, as('p0')));
  expect(counterOf(s, 'money', 'p0')).toBe(1488);
});
it('names the space when there is nothing to pay', () => {
  const onGo = env(fixtureBoardState(), as('p0', 0));
  expect(() => runPhrase(lib, 'effect', 'they pay its rent', onGo)).toThrow('Go has no rent.');
  const textRent = fixtureBoardGame({ board: { ...fixtureBoardGame().board!, spaces: FIXTURE_SPACES.map((sp, i) => (i === 1 ? { ...sp, attrs: { ...sp.attrs, rent: 'free' } } : sp)) } });
  expect(() => runPhrase(lib, 'effect', 'they pay its rent', fixtureEnv(fixtureBoardState(textRent), { game: textRent, ...as('p0', 1) })))
    .toThrow("Mill Lane's rent isn't a number.");
});
it('takes a player out and passes the turn when it was theirs', () => {
  const s = runPhrase<GameState>(lib, 'effect', 'they are out', env(fixtureBoardState(), as('p0')));
  expect(isOut(s, 'p0')).toBe(true);
  expect(s.turn).toEqual({ current: 'p1', phase: 'playing', chosen: true });
});
it('finds players below a number, skipping players who are out', () => {
  const start = markOut(setCounter(setCounter(fixtureBoardState(), 'money', 'p1', -5), 'money', 'p0', -1), 'p0');
  expect(runPhrase(lib, 'who', 'a player has less than 0 money', env(start))).toEqual(['p1']);
});
it('judges the buy conditions on the space they are on', () => {
  const onRose = placePiece(fixtureBoardState(), 'p0', 5);
  expect(runPhrase(lib, 'condition', 'it has a price', env(onRose, as('p0')))).toBe(true);
  expect(runPhrase(lib, 'condition', 'it has a price', env(fixtureBoardState(), as('p0')))).toBe(false);
  expect(runPhrase(lib, 'condition', 'no one owns it', env(onRose, as('p0')))).toBe(true);
  expect(runPhrase(lib, 'condition', 'they have at least its price in money', env(setCounter(onRose, 'money', 'p0', 179), as('p0')))).toBe(false);
  expect(runPhrase(lib, 'condition', 'they have rolled this turn', env(recordAction(onRose, 'p0', 'roll', false), as('p0')))).toBe(true);
});
it('matches moments', () => {
  const lands = { kind: 'land', seat: 'p0', space: 5 } as const;
  const owned = setOwner(fixtureBoardState(), 5, 'p1');
  expect(runPhrase(lib, 'moment', 'a player lands on a street or station someone else owns', env(owned), lands)).toBe(true);
  expect(runPhrase(lib, 'moment', 'a player lands on a street or station someone else owns', env(fixtureBoardState()), lands)).toBe(false);
  expect(runPhrase(lib, 'moment', 'a piece passes Go', env(fixtureBoardState()), { kind: 'pass', seat: 'p0', space: 0 })).toBe(true);
});
it('names the one player left as the winner', () => {
  const s = markOut(fixtureBoardState(), 'p1');
  expect(runPhrase(lib, 'winner', 'that player wins', fixtureEnv(s, { game, seats: ['p0', 'p1'] }), {})).toBe('p0');
});
```

In `flow-phrases.test.ts`: `'the turn passes to the left'` from p0 with p1 out (3 seats, board state) returns `'p2'`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/board-phrases.test.ts src/engine/core/lang/library/flow-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the phrases and helpers listed.
- [ ] **Step 4: Run** the tests (PASS), then `bun run test`.
- [ ] **Step 5: Commit** `feat(lang): board phrases for rolling, moving, paying, owning and going out`

---

### Task 5: Compiler: actions, moments, player rules and phrase flags

**Files:**
- Modify: `src/engine/core/lang/compile-util.ts` (`LineCtx`, `matchLine`)
- Modify: `src/engine/core/lang/compile-phase.ts`
- Modify: `src/engine/core/lang/compile.ts` (pre-read actions; contexts)
- Test: `src/engine/core/lang/compile-phase.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 4.
- Produces:
  - `LineCtx` gains `player: boolean; space: boolean`. The `stage` contexts in `compile.ts` start them as `false`. Card moves use `{ ...ctx, inMove: true, player: true }`. Actions and moments use `{ ...ctx, player: true, space: true }`. A trigger whose `when` resolved as kind `who` uses `{ ...ctx, player: true }`.
  - `matchLine` checks the matched entry's flags after `ok`. Each failure records a problem of kind `invalid` and returns `missingRef`:
    - `needsMove` keeps today's check.
    - `needsPlayer`, or `mentionsActor(args)`, when neither `inMove` nor `player` holds: today's message for `mentionsActor` stays as is. For `needsPlayer`: `` `“${clean}” only makes sense in a rule about a player, such as a move, an action or a “When a player …” rule.` ``
    - `needsSpace` without `space`: `` `“${clean}” only makes sense in a rule about a space, such as an action or a “lands on” rule.` ``
    - `needsPayment` with `ctx.vocab.payWith === null`: `'Say what players pay with, like “Players pay with money.” under Board:.'`
  - `compile-phase.ts`:
    - `ACTION_LINE = /^a player may (\w+)(?:\s+(.+))?$/i` is tried after the card-move regexes. `compileAction(node, found, ctx): DeclaredAction | null` reads `Only if` and `Then:` like `compileMove`.
    - `words` is the lowercase verb plus the rest. `label = actionLabel(words)`.
    - A verb already used by a move or an action in the same phase gives `` `Two rules in this phase start “A player may ${verb}”. Start one with another word.` `` A `reorder` verb keeps today's reserved message.
  - `export function actionLabel(words: string): string`: capitalizes the first letter and swaps whole words their→your, they're→you're, they→you, them→you, themselves→yourself. So `'end their turn'` → `'End your turn'` and `'buy the space they are on'` → `'Buy the space you are on'`.
  - `MOMENT_LINE = /^when (a piece passes .+|a player lands on .+):$/i` is tested before `TRIGGER`. `compileMoment(node, clean, whenText, ctx): CompiledMoment` matches `when` as kind `moment`. Its `text` is the whole line without the colon, as for triggers (for example `'When a player lands on a tax space'`). Its children are read like a trigger's (`Only if` groups, and effects via `matchEffectLine`).
  - `compileTrigger` matches `when` with `matchLine('condition', whenText, line, ctx, 'who')`.
  - **After lines** are detected with `/^after a player (.+)$/i`. `readAfter` gets `names: Map<string, string>`, which maps the third person of each card verb and action verb, and each action's `thirdPersonWords`, to the verb. It tries each `", "` split left to right:
    1. The first split where every item of the left part (split by `VERB_SEPARATOR`) is a known name and the right part matches a `turn` phrase wins.
    2. Otherwise, the first split where the items are known.
    3. Otherwise, the first split, reporting unknown items with today's message. The list of moves now includes the actions' third-person words.
  - `compile.ts` pre-reads actions from phase children that match `ACTION_LINE` and do not contain `' a card from '`. They become `{ verb, words }`, unique, and are passed to `vocabFrom`.

- [ ] **Step 1: Write the failing tests** in `compile-phase.test.ts`. Use `TINY_BOARD_HEAD` from Task 3 (move it to `testing.ts` as an export now) plus phase lines.

```ts
const phase = (lines: string[]) => compileGame(`${TINY_BOARD_HEAD}\n${lines.map((l) => `  ${l}`).join('\n')}`, createDefaultLibrary());

it('compiles an action with its conditions, effects and button label', () => {
  const { game } = phase(['A player may roll the dice.', '  Only if they have not rolled this turn.', '  Then:', '    Roll the dice.', '    Their piece moves forward by the roll.']);
  expect(game!.phases[0].actions).toEqual([expect.objectContaining({
    verb: 'roll', words: 'roll the dice', label: 'Roll the dice',
    conditions: [expect.objectContaining({ text: 'they have not rolled this turn' })],
    effects: [expect.objectContaining({ phrase: 'roll the dice' }), expect.objectContaining({ phrase: 'their piece moves forward by the roll' })],
  })]);
});
it('labels buttons in the second person', () => {
  expect(actionLabel('end their turn')).toBe('End your turn');
  expect(actionLabel('buy the space they are on')).toBe('Buy the space you are on');
});
it('compiles a moment rule and a player rule', () => {
  const { game, diagnostics } = phase(['When a piece passes Go:', '  Its player gets 200 money.', 'When a player has less than 0 money:', '  They are out.', '  Their spaces go back to the bank.']);
  expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  expect(game!.phases[0].moments[0].when).toMatchObject({ kind: 'moment', phrase: 'a piece passes {space}', args: [0] });
  expect(game!.phases[0].triggers[0].when).toMatchObject({ kind: 'who' });
});
it('reads an After line that names an action', () => {
  const { game } = phase(['A player may end their turn.', 'After a player ends their turn, the turn passes to the left.']);
  expect(game!.phases[0].after).toMatchObject({ verbs: ['end'] });
});
it('refuses "they" outside a rule about a player, "it" outside a rule about a space, and pay lines with nothing to pay with', () => {
  const they = compileGame(TINY_BOARD_HEAD.replace('Phase: playing', 'Setup:\n  They are out.\n\nPhase: playing'), createDefaultLibrary());
  expect(they.diagnostics).toContainEqual(expect.objectContaining({ message: '“They are out” only makes sense in a rule about a player, such as a move, an action or a “When a player …” rule.' }));
  const it2 = phase(['When a player has less than 0 money:', '  They own it.']);
  expect(it2.diagnostics).toContainEqual(expect.objectContaining({ message: '“They own it” only makes sense in a rule about a space, such as an action or a “lands on” rule.' }));
  const pay = compileGame(`${TINY_BOARD_HEAD.replace('  Players pay with money.\n', '')}\n  A player may buy the space they are on.\n    Then:\n      They pay its price.`, createDefaultLibrary());
  expect(pay.diagnostics).toContainEqual(expect.objectContaining({ message: 'Say what players pay with, like “Players pay with money.” under Board:.' }));
});
it('refuses two actions that start with the same verb', () => {
  const { diagnostics } = phase(['A player may pay the fine.', 'A player may pay the toll.']);
  expect(diagnostics).toContainEqual(expect.objectContaining({ message: 'Two rules in this phase start “A player may pay”. Start one with another word.' }));
});
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile-phase.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the changes listed.
- [ ] **Step 4: Run** the test (PASS), then `bun run test`. The existing After-line and trigger tests must pass unchanged.
- [ ] **Step 5: Commit** `feat(lang): compile button actions, moment rules and player rules`

---

### Task 6: Runtime and engine build for actions, moments and player rules

**Files:**
- Modify: `src/engine/core/lang/runtime.ts`
- Create: `src/engine/core/lang/declared-actions.ts`
- Modify: `src/engine/core/lang/build.ts`
- Modify: `src/engine/core/lang/testing.ts` (export `TINY_BOARD`)
- Test: `src/engine/core/lang/runtime.test.ts`, `src/engine/core/lang/declared-actions.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 5.
- Produces:
  - `LangRuntime.env(state, move?, example?, subject?)`: `subject` defaults to `{ player: move.by, space: null }` when a move is given. `announce` is bound to `this.announce`.
  - `test(ref, state, move?, example?, subject?)` and `run(ref, state, move?, example?, subject?)` pass `subject` through.
  - `who(ref, state): PlayerId[]` calls the `who` kind.
  - `announce(state, moment): GameState`: runs the current phase's `moments` in written order. For each, it calls the `moment` phrase with subject `{ player: moment.seat, space: moment.space }`, checks the `Only if` groups, and then runs the effects. Nesting deeper than `MAX_MOMENT_DEPTH = 20` throws `RuleError('It keeps moving pieces without stopping.', rule.line, rule.text)`. The depth counter must be reset in a `finally`.
  - `triggerSubject(phaseId: string, trigger: CompiledTrigger, state): Subject | null`: null unless `state.turn?.phase === phaseId`.
    - A `who` trigger returns the first seat from `who()` whose `Only if` groups hold, as `{ player: seat, space: null }`.
    - Any other trigger returns `{ player: null, space: null }` when `when` and the groups hold.
  - `fireTrigger(phaseId, trigger, state): GameState` runs the effects with that subject.
  - `declaredActionHandler(verb: string, runtime: LangRuntime): MoveHandler`:
    - `legal` returns, in order: `` `You can't ${verb} now.` `` when the phase declares no such action, "You're out of the game." when `isOut`, and the text of the first failing group (subject `{ player: by, space: null }`).
    - `apply` runs `recordAction(state, by, verb, phase.after?.verbs.includes(verb) ?? false)` first, then the effects. It throws a plain `Error` when not legal, as `declaredMoveHandler` does.
  - `build.ts`:
    - `createEngine` applies `withBoardData(initial, game, seats)` and registers `declaredActionHandler` for every action verb after the card verbs.
    - `flowDefFor`: `allow` includes action verbs. Each trigger becomes `{ id: \`line ${t.line}: ${t.text}\`, when: { name: 'lang:trigger-when', params: { phase, trigger: t } }, then: [{ name: 'lang:trigger-then', params: { phase, trigger: t } }] }`. The id text is unchanged, so `friendlyError` still names it.
    - `flowRegistryFor` registers those two names.
  - `testing.ts` exports `TINY_BOARD`, which is `TINY_BOARD_HEAD` plus these phase lines and an End: section:

```text
  A player may roll the dice.
    Only if they have not rolled this turn.
    Then:
      Roll the dice.
      Their piece moves forward by the roll.
  A player may buy the space they are on.
    Only if they have rolled this turn.
    Only if it has a price.
    Only if no one owns it.
    Only if they have at least its price in money.
    Then:
      They pay its price.
      They own it.
  A player may end their turn.
    Only if they have rolled this turn.
  When a piece passes Go:
    Its player gets 200 money.
  When a player lands on a street someone else owns:
    They pay its rent to its owner.
  When a player lands on a tax space:
    They pay its tax.
  When a player has less than 0 money:
    They are out.
    Their spaces go back to the bank.
  After a player ends their turn, the turn passes to the left.

End:
  The game ends when one player is left.
  That player wins.
```

- [ ] **Step 1: Write the failing tests** in `declared-actions.test.ts`. `TINY_BOARD`'s loop is Go (0), Mill Lane (1), Income Tax (2), Rose Lane (3).

```ts
const lib = createDefaultLibrary();
const game = compileGame(TINY_BOARD, lib).game!;
/** A two-player engine whose starting board has been arranged by `arrange`. */
const engineWith = (arrange: (s: GameState) => GameState, g = game) =>
  createEngine(g, lib, 2, arrange(withBoardData(initialState(g, 1), g, ['p0', 'p1']))).engine;
```

```ts
it('compiles TINY_BOARD with no diagnostics', () => expect(compileGame(TINY_BOARD, lib).diagnostics).toEqual([]));
it('starts with every piece on Go and 1500 money each', () => {
  const s = createEngine(game, lib, 2, initialState(game, 1)).engine.getState();
  expect([pieceAt(s, 'p0'), counterOf(s, 'money', 'p1')]).toEqual([0, 1500]);
});
it('rolls once per turn, ends the turn, and passes it to the left', () => {
  const engine = engineWith((s) => queueRoll(s, [1, 2]));
  expect(engine.dispatch({ type: 'roll', by: 'p0' }).ok).toBe(true);
  expect(engine.dispatch({ type: 'roll', by: 'p0' })).toMatchObject({ ok: false, reason: 'they have not rolled this turn' });
  expect(engine.dispatch({ type: 'end', by: 'p0' }).ok).toBe(true);
  expect(engine.getState().turn?.current).toBe('p1');
  expect(engine.canDispatch({ type: 'end', by: 'p1' })).toBe('they have rolled this turn');
});
it('pays 200 once for passing Go and once for landing on it', () => {
  const passing = engineWith((s) => queueRoll(placePiece(s, 'p0', 3), [1, 1])); // 3 → Go → Mill Lane
  passing.dispatch({ type: 'roll', by: 'p0' });
  expect(counterOf(passing.getState(), 'money', 'p0')).toBe(1700);
  const landing = engineWith((s) => queueRoll(placePiece(s, 'p0', 2), [1, 1])); // 2 → Rose Lane → Go
  landing.dispatch({ type: 'roll', by: 'p0' });
  expect(pieceAt(landing.getState(), 'p0')).toBe(0);
  expect(counterOf(landing.getState(), 'money', 'p0')).toBe(1700);
});
it('a player who goes below 0 is out, loses their spaces, and the last player left wins', () => {
  const engine = engineWith((s) => queueRoll(setCounter(setOwner(s, 1, 'p0'), 'money', 'p0', 100), [1, 1]));
  engine.dispatch({ type: 'roll', by: 'p0' }); // Go → Income Tax: 100 - 200 < 0
  const s = engine.getState();
  expect(isOut(s, 'p0')).toBe(true);
  expect(pieceAt(s, 'p0')).toBeNull();
  expect(ownerOf(s, 1)).toBeNull();
  expect(s.result).toEqual({ winner: 'p1' });
});
it('says a moment rule that keeps moving pieces never settles', () => {
  const looping = TINY_BOARD.replace('  When a player lands on a tax space:\n    They pay its tax.', '  When a player lands on a tax space:\n    Their piece moves forward by the roll.');
  expect(looping).not.toBe(TINY_BOARD);
  const g = compileGame(looping, lib).game!;
  // From Income Tax, a roll of 4 goes once round the 4-space loop and lands on Income Tax again, forever.
  const engine = engineWith((s) => queueRoll(placePiece(s, 'p0', 2), [2, 2]), g);
  let thrown: unknown;
  try { engine.dispatch({ type: 'roll', by: 'p0' }); } catch (e) { thrown = e; }
  expect(friendlyError(thrown)).toMatch(/^Line \d+ \(“When a player lands on a tax space”\): It keeps moving pieces without stopping\.$/);
});
it('replays rolls and moments exactly', () => {
  const { engine } = createEngine(game, lib, 3, initialState(game, 9));
  for (let turn = 0; turn < 12; turn++) {
    const cur = engine.getState().turn!.current;
    engine.dispatch({ type: 'roll', by: cur });
    if (engine.canDispatch({ type: 'buy', by: cur }) === true) engine.dispatch({ type: 'buy', by: cur });
    engine.dispatch({ type: 'end', by: cur });
  }
  const fresh = createEngine(game, lib, 3, initialState(game, 9)).engine;
  fresh.loadLog([...engine.getLog()]);
  expect(fresh.getState()).toEqual(engine.getState());
});
```

In `runtime.test.ts`: `env(state, undefined, undefined, { player: 'p1', space: 2 }).subject` equals that subject; with a card `MoveInfo` and no subject, `subject` is `{ player: move.by, space: null }`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/runtime.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the runtime, handler and build changes.
- [ ] **Step 4: Run** the tests (PASS), then `bun run test`. TEST_DUEL, Hearts and Color Match triggers still fire as before through `lang:trigger-*`.
- [ ] **Step 5: Commit** `feat(lang): run button actions, moment rules and player rules on the engine`

---

### Task 7: Example phrases for boards, and examples on boards

**Files:**
- Modify: `src/engine/core/lang/library/board-phrases.ts` (given / action / expect)
- Modify: `src/engine/core/lang/examples.ts`
- Test: `src/engine/core/lang/library/board-phrases.test.ts`, `src/engine/core/lang/examples.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 6.
- Produces:
  - **Given:**
    - `'{player} is on {space}'`, `'{player} owns {space}'`, `'{player} has {int} {counter}'`, `'{player} is out'` (`markOut`, with no turn change)
    - `'{player} has {done} this turn'` (`recordAction(…, false)`)
    - `'the next roll is {int} and {int}'` and `'the next roll is {int}'` (`queueRoll`). These check against `game.board.dice`:
      - wrong count: `` `This game rolls ${count} dice, so give ${count} numbers.` `` (a game with one die: "This game rolls 1 die, so give 1 number.")
      - impossible face: `` `A ${sides}-sided die can't roll ${face}.` ``
      - no dice: the Task 4 no-dice message
  - **Action:** `'{player} {action}'` returns `{ by, move: { type: verb } }`.
  - **Expect:**
    - `'{player} is on {space}'`: "Expected p0 to be on Rose Lane, but they are on Cedar Avenue." / "…, but they have no piece on the board."
    - `'{player} owns {space}'`: "Expected p0 to own Rose Lane, but p1 owns it." / "…, but no one owns it."
    - `'no one owns {space}'`: "Expected no one to own Rose Lane, but p1 owns it."
    - `'{player} has {int} {counter}'`: "Expected p0 to have 1486 money, but they have 1500."
    - `'{player} is out'`: "Expected p0 to be out, but they are still in."
  - `examples.ts`: the starting `table` becomes `withBoardData({ ...initialState(game, SEED), turn }, game, seats)`.

- [ ] **Step 1: Write the failing tests.** In `examples.test.ts`, use `TINY_BOARD` plus examples:

```ts
const withExamples = (...blocks: string[]) => compileGame(`${TINY_BOARD}\n\n${blocks.join('\n\n')}`, lib);

it('runs a board example', () => {
  const { game } = withExamples([
    'Example: rent goes to the owner', '  Given p1 owns Rose Lane', '  And p0 is on Mill Lane', '  And the next roll is 1 and 1',
    '  When p0 rolls the dice', '  Then p0 is on Rose Lane', '  And p0 has 1486 money', '  And p1 has 1514 money',
  ].join('\n'));
  expect(runExamples(game!, lib)).toEqual([expect.objectContaining({ status: 'pass' })]);
});
it('says what a board example found instead', () => {
  const { game } = withExamples([
    'Example: wrong amount', '  Given p0 is on Mill Lane', '  And the next roll is 1 and 1', '  When p0 rolls the dice', '  Then p0 has 1 money',
  ].join('\n'));
  expect(runExamples(game!, lib)[0]).toMatchObject({ status: 'fail', message: 'Expected p0 to have 1 money, but they have 1500.' });
});
it('refuses a fixed roll with the wrong number of dice or an impossible face, on its own line', () => {
  const { game } = withExamples(
    ['Example: one number', '  Given the next roll is 3', '  When p0 rolls the dice', '  Then p0 has 1500 money'].join('\n'),
    ['Example: a seven', '  Given the next roll is 7 and 1', '  When p0 rolls the dice', '  Then p0 has 1500 money'].join('\n'),
  );
  const [one, seven] = runExamples(game!, lib);
  expect(one).toMatchObject({ status: 'fail', message: expect.stringContaining('This game rolls 2 dice, so give 2 numbers.') });
  expect(seven).toMatchObject({ status: 'fail', message: expect.stringContaining("A 6-sided die can't roll 7.") });
  expect(one.atLine).toBe(seven.atLine! - 5);
});
```

`TINY_BOARD`'s loop is Go, Mill Lane, Income Tax, Rose Lane, so Mill Lane + 2 is Rose Lane.

In `board-phrases.test.ts`, test each expect message above with `runPhrase(lib, 'expect', …)` on arranged board states.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/examples.test.ts src/engine/core/lang/library/board-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the phrases and the `examples.ts` change.
- [ ] **Step 4: Run** the tests (PASS), then `bun run test`.
- [ ] **Step 5: Commit** `feat(lang): Given, When and Then for board examples`

---

### Task 8: Seat views carry the board and the seat's buttons

**Files:**
- Modify: `src/engine/net/protocol.ts` (`ClientView.extras?: Json`)
- Modify: `src/engine/net/game-server.ts`
- Create: `src/engine/core/lang/board-view.ts`
- Test: `src/engine/net/game-server.test.ts`, `src/engine/core/lang/board-view.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 7.
- Produces:
  - `GameServer` constructor args gain `extras?: (state: GameState, seat: PlayerId) => Json`. `viewFor` adds `extras` only when the callback is given, so existing views are unchanged.
  - `board-view.ts`:
    - `type SpaceView = { name: string; color: string | null; details: { [k: string]: Json }; owner: PlayerId | null }`: `color` is the `color` attribute when it is a string, and `details` is every other attribute.
    - `type CounterView = { name: string; values: { [seat: string]: number | null } }`: null when the seat may not see it.
    - `type BoardView = { spaces: SpaceView[]; pieces: { [seat: string]: number }; roll: number[] | null; counters: CounterView[]; out: PlayerId[] }`
    - `type ActionView = { verb: string; label: string; allowed: true | string }`
    - `type SeatExtras = { board: BoardView | null; actions: ActionView[] }`
    - `seatExtras(engine: GameEngine, runtime: LangRuntime, state: GameState, seat: PlayerId): SeatExtras`: the actions are the current phase's actions in written order. For a seat that is out while the game goes on, every action's `allowed` is "You're out of the game.". Otherwise `allowed` is `engine.canDispatch({ type: verb, by: seat })`, mapped through `friendlyReason(reason, state.turn?.current)`. The board is null for a game without one.
    - `readSeatExtras(extras: Json | undefined): SeatExtras | null`: a shape check for the page; null for anything else.

- [ ] **Step 1: Write the failing tests.** `game-server.test.ts`: a server built with `extras: (s, seat) => ({ seat })` has `viewFor('me').extras` equal to `{ seat: 'me' }`, and a server without it has no `extras` key. `board-view.test.ts`, using `TINY_BOARD`:

```ts
it('shows the board and the buttons from each seat', () => {
  const { engine, runtime } = createEngine(game, lib, 2, initialState(game, 1));
  const p0 = seatExtras(engine, runtime, engine.getState(), 'p0');
  expect(p0.board!.spaces[1]).toEqual({ name: 'Mill Lane', color: 'brown', details: { kind: 'street', price: 60, rent: 2 }, owner: null });
  expect(p0.board!.pieces).toEqual({ p0: 0, p1: 0 });
  expect(p0.board!.counters).toEqual([{ name: 'money', values: { p0: 1500, p1: 1500 } }]);
  expect(p0.actions).toEqual([
    { verb: 'roll', label: 'Roll the dice', allowed: true },
    { verb: 'buy', label: 'Buy the space you are on', allowed: 'they have rolled this turn' },
    { verb: 'end', label: 'End your turn', allowed: 'they have rolled this turn' },
  ]);
  expect(seatExtras(engine, runtime, engine.getState(), 'p1').actions.every((a) => a.allowed === "It's p0's turn.")).toBe(true);
});
it('hides numbers only their owner can see', () => {
  const secretGame = compileGame(TINY_BOARD.replace('  Players pay with money.', '  Each player has 3 secrets that only they can see.\n  Players pay with money.'), lib).game!;
  const { engine, runtime } = createEngine(secretGame, lib, 2, initialState(secretGame, 1));
  expect(seatExtras(engine, runtime, engine.getState(), 'p1').board!.counters[1]).toEqual({ name: 'secrets', values: { p0: null, p1: 3 } });
});
it('greys every button once the game is over', () => {
  const start = queueRoll(setCounter(withBoardData(initialState(game, 1), game, ['p0', 'p1']), 'money', 'p0', 100), [1, 1]);
  const { engine, runtime } = createEngine(game, lib, 2, start);
  engine.dispatch({ type: 'roll', by: 'p0' });
  expect(seatExtras(engine, runtime, engine.getState(), 'p1').actions.map((a) => a.allowed)).toEqual(['The game is over.', 'The game is over.', 'The game is over.']);
});
it('greys the buttons of a seat that is out while the game goes on', () => {
  const start = queueRoll(setCounter(withBoardData(initialState(game, 1), game, ['p0', 'p1', 'p2']), 'money', 'p0', 100), [1, 1]);
  const { engine, runtime } = createEngine(game, lib, 3, start);
  engine.dispatch({ type: 'roll', by: 'p0' });
  expect(engine.getState().result).toBeUndefined();
  expect(seatExtras(engine, runtime, engine.getState(), 'p0').actions.every((a) => a.allowed === "You're out of the game.")).toBe(true);
});
it('reads extras back, and nothing else', () => {
  expect(readSeatExtras(undefined)).toBeNull();
  expect(readSeatExtras({ board: null, actions: [] })).toEqual({ board: null, actions: [] });
});
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/net/game-server.test.ts src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the protocol, server and `board-view.ts` changes.
- [ ] **Step 4: Run** the tests (PASS), then `bun run test`.
- [ ] **Step 5: Commit** `feat(net): seat views carry extras; feat(lang): board and button views per seat`

---

### Task 9: Rent Day in the language (the proof)

**Files:**
- Create: `src/games/rent-day.rules`
- Create: `src/games/rent-day.test.ts`

**Interfaces:**
- Consumes: everything above. Seat ids `p0…`, move types `roll`, `buy` and `end`, and `counterOf`, `pieceAt`, `ownerOf`, `isOut`, `latestRoll` from `board-state.ts`.

- [ ] **Step 1: Write `src/games/rent-day.rules`.** It is the spec's text from `Game: Rent Day` through the `End:` section (including `Players pay with money.`), followed by these examples, in this order:

```text
Example: landing on someone else's street pays them rent
  Given p1 owns Rose Lane
  And p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 is on Rose Lane
  And p0 has 1486 money
  And p1 has 1514 money

Example: a player can buy the street they land on
  Given p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  And p0 buys the space they are on
  Then it is accepted
  And p0 owns Rose Lane
  And p0 has 1320 money

Example: you cannot buy before rolling
  Given p0 is on Rose Lane
  When p0 buys the space they are on
  Then it is rejected because "they have rolled this turn"

Example: you cannot buy a space that has no price
  Given p0 is on Go
  And the next roll is 3 and 4
  When p0 rolls the dice
  And p0 buys the space they are on
  Then it is rejected because "it has a price"

Example: you cannot buy a space someone owns
  Given p1 owns Rose Lane
  And p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  And p0 buys the space they are on
  Then it is rejected because "no one owns it"

Example: you cannot buy without enough money
  Given p0 has 100 money
  And p0 is on Cedar Avenue
  And the next roll is 3 and 4
  When p0 rolls the dice
  And p0 buys the space they are on
  Then it is rejected because "they have at least its price in money"

Example: you cannot roll twice in one turn
  Given p0 is on Go
  And the next roll is 1 and 2
  When p0 rolls the dice
  And p0 rolls the dice
  Then it is rejected because "they have not rolled this turn"

Example: you cannot end your turn before rolling
  When p0 ends their turn
  Then it is rejected because "they have rolled this turn"

Example: passing Go pays 200
  Given p0 is on The Promenade
  And the next roll is 1 and 1
  When p0 rolls the dice
  Then p0 is on Mill Lane
  And p0 has 1700 money

Example: landing on Go pays 200 once
  Given p0 is on Oak Gardens
  And the next roll is 5 and 6
  When p0 rolls the dice
  Then p0 is on Go
  And p0 has 1700 money

Example: a tax space charges its tax
  Given p0 is on Go
  And the next roll is 1 and 3
  When p0 rolls the dice
  Then p0 is on Income Tax
  And p0 has 1300 money

Example: a station charges its rent
  Given p1 owns North Station
  And p0 is on Go
  And the next roll is 2 and 3
  When p0 rolls the dice
  Then p0 has 1475 money
  And p1 has 1525 money

Example: a utility charges 4 times the roll
  Given p1 owns Power Works
  And p0 is on Cedar Avenue
  And the next roll is 1 and 2
  When p0 rolls the dice
  Then p0 has 1488 money
  And p1 has 1512 money

Example: going below 0 puts you out
  Given 3 players
  And p0 owns Rose Lane
  And p1 owns The Promenade
  And p0 has 30 money
  And p0 is on Harbour Heights
  And the next roll is 1 and 1
  When p0 rolls the dice
  Then p0 is out
  And no one owns Rose Lane
  And p1 has 1550 money
  And it is p1's turn

Example: the turn passes to the left, skipping players who are out
  Given 3 players
  And p1 is out
  And p0 is on Go
  And the next roll is 1 and 2
  When p0 rolls the dice
  And p0 ends their turn
  Then it is p2's turn

Example: the last player left wins
  Given p1 owns The Promenade
  And p0 has 30 money
  And p0 is on Harbour Heights
  And the next roll is 1 and 1
  When p0 rolls the dice
  Then p1 wins
```

- [ ] **Step 2: Write `src/games/rent-day.test.ts`**, in the shape of `color-match.test.ts`:

```ts
const lib = createDefaultLibrary();
const { game, diagnostics } = compileGame(RENT_DAY, lib);
const SPACES = 40;

/** One turn of a player who always buys when allowed: roll, maybe buy, end (unless the roll put them out). */
function playTurn(engine: GameEngine): void { /* roll; check money; buy if canDispatch; end if still their turn and no result */ }

it('compiles with no diagnostics', () => expect(diagnostics).toEqual([]));
it('passes every example', () => {
  const results = runExamples(game!, lib);
  expect(results).toHaveLength(16);
  expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
});
it.each([2, 3, 4, 5, 6, 7, 8])('plays 60 rounds at %i players without breaking a rule of money', (n) => {
  const { engine } = createEngine(game!, lib, n, initialState(game!, 200 + n));
  const seats = seatsFor(n);
  for (let turn = 0; turn < 60 * n && engine.getState().result === undefined; turn++) {
    // Before the roll: the mover's space and everyone's total money.
    // After the roll: total changes by +200 when before + roll total >= 40, and by −tax when the landing space's kind is tax.
    // After a buy: total changes by −price of the space. After end: no change.
    // Always: every owner is still in, the turn is held by a player still in, and players who are out have no piece.
  }
});
it.each([[2, 1], [4, 2], [8, 3]])('a game with little money and no Go salary ends with a winner at %i players (seed %i)', (n, seed) => {
  const salary = '  When a piece passes Go:\n    Its player gets 200 money.\n';
  expect(RENT_DAY).toContain('Each player has 1500 money');
  expect(RENT_DAY).toContain(salary);
  const lean = RENT_DAY.replace('Each player has 1500 money', 'Each player has 300 money').replace(salary, '');
  const g = compileGame(lean, lib).game!;
  const { engine } = createEngine(g, lib, n, initialState(g, seed));
  for (let actions = 0; actions < 20000 && engine.getState().result === undefined; actions++) playTurn(engine);
  const winner = (engine.getState().result as { winner: string }).winner;
  expect(playersIn(engine.getState(), seatsFor(n))).toEqual([winner]);
});
it('undo takes back every move, and the log rebuilds the same game', () => { /* 40 turns at 4 players, seed 42: loadLog equals; undo to start equals a fresh engine */ });
```

Write out the money invariant in full in the test, using `latestRoll`, `pieceAt`, `counterOf`, and `game!.board!.spaces[i].attrs`. Without a Go salary, money only leaves the table (taxes and purchases), so the lean game always ends. If a seed has not finished at 20000 iterations, raise the cap rather than changing the rules, and say so in the commit.

- [ ] **Step 3: Run** `bunx vitest run src/games/rent-day.test.ts`. Expected before fixes: whatever is still wrong in the phrases or examples. Fix the phrases rather than the examples; the example numbers above are worked out from the spec's table.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. Everything passes, including Hearts and Color Match.
- [ ] **Step 5: Commit** `feat(games): Rent Day, slice 1 of a property-trading board game, in the designer language`

---

### Task 10: The playtest draws the board, the money line and the buttons; README

**Files:**
- Create: `src/pages/designer/seat-colors.ts`, `src/pages/designer/space-colors.ts`, `src/pages/designer/board-ring.ts`, `src/pages/designer/board-grid.tsx`, `src/pages/designer/board-controls.tsx`
- Modify: `src/pages/designer/playtest.tsx`, `src/pages/designer/seat-status.ts`, `src/pages/designer/samples.ts`, `README.md`
- Test: `src/pages/designer/board-ring.test.ts`, `src/pages/designer/playtest.test.tsx`, `src/pages/designer/seat-status.test.ts`, `src/pages/designer/designer-page.test.tsx`

**Interfaces:**
- Consumes: `SeatExtras`, `BoardView`, `ActionView` and `readSeatExtras` (Task 8); `seatExtras` (Task 8).
- Produces:
  - `SEAT_COLORS: string[]`: 8 distinct CSS colors. `seatColor(seat: PlayerId): string` returns `SEAT_COLORS[n % 8]` for `p<n>`.
  - `spaceColor(name: string | null): string | null` maps brown, light blue, pink, orange, red, yellow, green, dark blue, blue, purple, black, white and gray/grey (any case). Unknown names give `'#9ca3af'` and null gives null.
  - `ringSize(n: number): number`, which is `Math.ceil(n / 4) + 1`.
  - `ringCells(n: number): { row: number; col: number }[]`: with `s = ringSize(n) - 1` and `P = 4 * s`, space `i` goes to perimeter cell `k = Math.round(i * P / n)`, where:
    - `k < s` → `(s, s - k)`
    - `k < 2s` → `(s - (k - s), 0)`
    - `k < 3s` → `(0, k - 2s)`
    - otherwise `(k - 3s, s)`
  - `BoardGrid({ board }: { board: BoardView })` is a CSS grid of `ringSize` × `ringSize`:
    - each space shows its color band, an owner mark in `seatColor(owner)`, and a dot per piece in `seatColor(seat)`;
    - each space has `title` `` `${name} — ${Object.entries(details).map(([k, v]) => `${k} ${v}`).join(', ')}` `` (just `name` when there are no details);
    - the center shows the latest roll with `aria-label` `` `Rolled ${roll.join(' and ')}` `` (nothing before the first roll).
  - `MoneyLine({ board }: { board: BoardView })`: one entry per seat in seat order, colored. It reads `p0 1,500 money`, or `p1 ? secrets` when hidden, or `p2 out`.
  - `ActionButtons({ actions, onPress, onRefused })`:
    - one `<button type="button">` per action with the action's label;
    - `aria-disabled` is true when `allowed !== true`, with `title` set to the reason;
    - a click calls `onPress(verb)` when allowed, else `onRefused(reason)`.
  - `playtest.tsx`:
    - `start()` passes `extras: (state, seat) => seatExtras(engine, runtime, state, seat)` to `GameServer`.
    - A seat whose extras have a board renders the status line, the notice, `BoardGrid`, `MoneyLine` and `ActionButtons`. `onPress` sends `{ type: verb }` and `onRefused` calls `flash(reason)`.
    - The `CardTable` canvas renders only when `tableDef.zones.length > 0`.
  - `seatStatus` returns `"You're out."` for a seat listed in its extras' `board.out` while the game is not over.
  - `SAMPLES` gains `{ name: 'Rent Day', text: RENT_DAY }`.

- [ ] **Step 1: Write the failing tests**

```ts
// board-ring.test.ts
it('puts 40 spaces on an 11 by 11 ring, corners at every tenth space', () => {
  const cells = ringCells(40);
  expect(ringSize(40)).toBe(11);
  expect([cells[0], cells[10], cells[20], cells[30], cells[39]]).toEqual([{ row: 10, col: 10 }, { row: 10, col: 0 }, { row: 0, col: 0 }, { row: 0, col: 10 }, { row: 9, col: 10 }]);
  expect(new Set(cells.map((c) => `${c.row},${c.col}`)).size).toBe(40);
});
it('spreads other counts evenly, each on its own cell', () => {
  for (const n of [4, 10, 13, 41]) expect(new Set(ringCells(n).map((c) => `${c.row},${c.col}`)).size).toBe(n);
});
```

In `playtest.test.tsx`, mount Rent Day with 3 players and seed 1. The existing `vi.mock`s stay; no `CardTable` renders for Rent Day.

```ts
it('gives each seat its board, money line and buttons, greyed with the reason', () => {
  mountRentDay();
  expect(screen.getAllByRole('button', { name: 'Roll the dice' })).toHaveLength(3);
  const [p0Roll, p1Roll] = screen.getAllByRole('button', { name: 'Roll the dice' });
  expect(p0Roll.getAttribute('aria-disabled')).toBe('false');
  expect(p1Roll.getAttribute('aria-disabled')).toBe('true');
  expect(p1Roll.getAttribute('title')).toBe("It's p0's turn.");
  expect(screen.getAllByText('p0 1,500 money')).toHaveLength(3);
  expect(screen.getAllByTitle(/^Rose Lane — /)).toHaveLength(3);
});
it('rolls on press, and a greyed button says why instead of sending', () => {
  mountRentDay();
  const [p0Roll, p1Roll] = screen.getAllByRole('button', { name: 'Roll the dice' });
  fireEvent.click(p0Roll);
  expect(screen.getAllByLabelText(/^Rolled \d and \d$/)).toHaveLength(3);
  expect(screen.getAllByRole('button', { name: 'Roll the dice' })[0].getAttribute('title')).toBe('they have not rolled this turn');
  fireEvent.click(p1Roll);
  expect(screen.getByText("It's p0's turn.")).toBeTruthy();
});
```

In `seat-status.test.ts`: a view with `extras: { board: { …, out: ['p1'] }, actions: [] }` gives `"You're out."` for p1. In `designer-page.test.tsx`: loading the `Rent Day` sample shows no problems, lists 16 passing examples, offers 2 to 8 players, and enables Play.

- [ ] **Step 2: Run** `bunx vitest run src/pages/designer`. Expected: FAIL.
- [ ] **Step 3: Implement** the components and changes. Keep inline styles like the rest of `pages/designer`; the board fits within the seat panel's 800 px width.
- [ ] **Step 4: Run** `bunx vitest run src/pages/designer` (PASS), then `bun run test` and `bun run typecheck`. Then `bun run dev`, open `/#designer`, load Rent Day, and play a few turns at 4 players to check that the board, the money line and the greyed buttons behave as in the mockup's layout B.
- [ ] **Step 5: Update `README.md`.**
  - Under *Designing a game*, mention Rent Day in **Load sample**, and add a short "Board games" paragraph: the `Board:` section, `A player may …` buttons, and `When a piece passes …` / `When a player lands on …` rules.
  - In the roadmap, mark "Tokens and meeples" as in progress, with slice 1 shipped and pointing at the overview spec.
- [ ] **Step 6: Commit** `feat(designer): play board games: board, money line and buttons per seat; docs: README`
