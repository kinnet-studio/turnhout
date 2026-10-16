# Startup Simulator Slice 1a-1 (Language and Rules) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Startup Simulator's first slice (the table, the money and the turn) is written in the designer language as `src/games/startup-simulator.rules`, compiles with no diagnostics, passes 21 examples, plays to the Market Crash and a score at 2 to 5 players, and can be loaded and played in the designer. To get there the language gains counters without a board, a per-turn budget, turns made of steps that pass with no press, a seeded start player, rules for every phase, an End that waits for the round, tied winners, card moves that pay the card's price, stacks that never run out, and rows and queues.

**Architecture:**
- **Language layer only.** New work is in `src/engine/core/lang/`, `src/games/` and, for Task 1 only, three small changes to the designer page. `flow.ts`, `game-state.ts` and `game-engine.ts` stay untouched; the turn machine is built from phrases and one flow trigger that the rules compiler adds (`build.ts`), as the builder check's prototype (`turns.ts` with `f-turns.rules`) showed.
- **This is plan 1a-1 of two.** Plan 1a-2 (the fitting per-viewer layout, the seat switcher and private strip, card faces, the browser check) is not here. The only page work here is R3's decoupling: the board grid is drawn only when there are spaces, the money line when there are counters or facts, and the buttons when the game has buttons. The game is playable in the designer at the end, with the page as it is.
- **Where the new pieces live.**
  - Counters under `Players:`: `compile.ts`. Per-turn counters, `spend`, singular counter names, `go back to`, the per-N score: `library/board-phrases.ts`, `refs.ts`.
  - Rounds and turns: a new `turns.ts` (state keys and helpers), `runtime.ts`, `build.ts`, `compile-phase.ts`, `compile.ts`, a new `library/turn-phrases.ts`.
  - Ties: `runtime.ts`, `library/flow-phrases.ts`, `library/example-phrases.ts`, `refs.ts` (`{players}`), `src/pages/designer/seat-status.ts`.
  - The card's attribute: `library/move-phrases.ts`. Endless stacks: `cards.ts`, a new `library/stack-phrases.ts`, `examples.ts`. Rows and queues: a new `library/queue-phrases.ts`, `refs.ts` (`{sharedzone}`), `cards.ts` (blank cells).
- **No `library/startup-simulator.ts`.** Every phrase here is general; every number is in the rules text.
- **Rulings this plan carries** (from the spec's R1–R11, plus the controller's notes from the slice 1b builder check, numbered here so tasks can cite them):
  - **C1.** "The turn passes to the left." never runs any phase's "When this phase starts:" lines. Those would run inside the pass, before End is checked, in the round-finished window. Task 3 builds it; Task 5 pins it.
  - **C2.** The turn-start trigger runs the `In every phase:` "When a player's turn starts:" lines, then the same rules written under the phase the turn starts in. It never fires during Setup. Task 4.
  - **C3.** A game that has the turn-start trigger gets a compile warning for "When this phase starts:" under its first phase: those lines run only on the game's first turn. Task 4.
  - **C4.** In the product tables, the four cost and maintenance columns hold 0, never a blank, where the rulebook prints no number for that color. Blank-is-absent (R8) is for "None" and "--" cells only. Task 9a pins it.
  - **C5.** The `In every phase:` section is built in this plan, not moved to 1b.
- **Builder calls this plan makes** (the spec leaves them open):
  - A turn-taking phase is any phase whose actor is the current player: one with no "Everyone acts at once." line, or whose last such line is "Players take turns." Interrupt phases are turn-taking by default, so R1.1 covers them.
  - A game that uses turns but has no "The start player is chosen at random." line has p0 as its start player.
  - The step that finishes a turn (R1.6) is the effect "the turn passes to the left" used as a Given: `Given the turn passes to the left`.
  - Talent names drop the rulebook's leading "The" (Hacker, Architect, Veteran, Diva, Engineer, Fixer). A card reference is an article followed by a value, so "the Hacker" only reads when the name is "Hacker". The Metaverse keeps its name, because "Metaverse" is also a Tag.
  - The talent `role` column is the §20.B.1 group, `Senior Developer` or `Specialist`. Backend and Hardware come from `skill` (`software`, `hardware`, `flex`, `qa`, as slice 1b's spec reads it). A role equal to the name, as "QA Engineer" would be, makes "a QA Engineer" ambiguous between two columns.
  - The seat status names every winner of a shared win (R11), in this plan's ties task.
  - `{zone} has {card}` for a shared zone (R6) is written `{sharedzone} has {card}`. A plain `{zone}` would make "their research has the market crash" ambiguous with the existing `their {perzone} has {card}`.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-1a-table-money-turns-design.md` (binding, with its Builder-check rulings R1–R11), under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md` (binding constraints and anti-goals). Game data and rules come from `kinnet-studio/suwa`'s `rulebook.md` (Version 6.0): §2–§6, §12–§15, §20.B–C, §20.F and the Rulings Log. The builder check behind R1–R11 is `builder-check-startup-1a.md`, with its probes.

## Global Constraints

- **Hard constraints (verbatim):**
  - Protected files must not change: `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, and anything under `src/pages/hearts-demo/**`.
  - The core is pure: no pixi/react/DOM imports in `src/engine/core/**`, no `Math.random` or `Date.now`; randomness only from the seeded rng in state.
  - State stays Json-only, with new keys under `lang:*` in `state.data`.
  - No Startup Simulator words in shared code (capital, talent, agency, junior, backlog, seed, growth, crash, vaporware, …); they stay in the rules text and its test.
  - Hearts, Color Match, Venom and Rent Day pass unchanged; `bun run typecheck` is clean; the full `bun run test` (check package.json for the exact script) passes.
- **Branch and commands.**
  - Work on the branch this plan is committed on. Before Task 1, record the commit with `git rev-parse HEAD` as `BASE`; Task 10's word check diffs against it.
  - Single test file: `bunx vitest run <path>`. Full suite: `bun run test` (it runs `vitest run`); run it once first to get the passing count. Types: `bun run typecheck`.
- **No new dependencies.**
- **New `state.data` keys:** `lang:start-player`, `lang:turn-of`, `lang:round` and `lang:next-card`. Nothing else is stored.
- **Json shapes.** Everything in `CompiledGame` and `SeatExtras`, every `lang:*` value and every move is `Json`. Declare shapes with `type` aliases, and use `null` (never `undefined`) inside them.
- **No Startup Simulator words in shared code.**
  - Banned (any capitals, any form): capital, talent, agency, junior, backlog, growth, crash, vaporware, university, bench, ideation, startup, research, recruit, product, job market, idea pool, and "seed" meaning a deck, market, card or product. "seed" for the random-number seed stays as it is.
  - They may not appear in non-test files under `src/engine` or `src/pages`, comments included, nor in `src/engine/core/lang/testing.ts`. Tests and fixtures in this plan use general words (coins, gems, chores, stash, list, done pile).
  - They may appear in `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`, `src/pages/designer/samples.ts` (the sample's import and name), `src/pages/designer/designer-page.test.tsx`, README and docs.
- **No engine words in front of designers.** Diagnostics, rejection reasons, example results and the page never show `FlowDef`, `NamedRef`, `zoneId`, `lang:` or stack traces.
- **Existing behaviour stays.** The four games compile with no diagnostics and pass their examples unchanged; Rent Day keeps 108 examples. These existing tests change, and no others:
  - `compile.test.ts`: the unknown-section message (3 places) gains "In every phase" (Task 4); the two "need a Board: section" messages (Task 1); counter literals gain `perTurn: false` (Task 2).
  - Hand-built `CounterSpec`, `CompiledGame`, `CompiledPhase` and `BoardView` literals gain the new fields (`perTurn`, `everyPhase`, `turnStarts`, `startPlayer`). That covers `testing.ts`, `zones.test.ts`, `library/board-phrases.test.ts`, `board-view.test.ts`, `src/pages/designer/board-parts.test.tsx` and `src/pages/designer/seat-status.test.ts`.
  - The two fake example claimers (`library/example-phrases.test.ts`, `runtime.test.ts`) return `{ id, state }` (Task 7).
  - If any other existing test fails, stop and report it instead of changing it.
- **Style and commits.** 2-space indent, single quotes, chainable registrars, comments that say why. Commit prefixes `feat(lang):`, `feat(games):`, `feat(designer):`, `docs:`. Stage files by path, never `git add -A`. TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.

## Review Focus

- **Decks that run short.** Research on a deck of 1 or 2 cards shows that many and keeps 1. A market or the agency row whose deck is empty stays short, with no error and no loop: 3 agency cards stay 3. Test in Task 9b.
- **The Market Crash as the last growth card.** A refill draws it, sets it aside and finds no replacement. The growth market stays at 1 card, nothing throws, and the game ends after the round. Test in Task 9b.
- **A press out of turn or out of phase.** A rival's press is refused with "It's p1's turn.", and a recruit during Cleanup with "You can't recruit a junior software dev during bench cleanup.". Nothing changes and no AP is lost. Examples in Task 9a.
- **Undo and replay with made cards.** A Junior's id comes from `lang:next-card`, so undoing a recruit and recruiting again makes the same id, and replaying the log rebuilds the same state. Test in Task 7, and through a whole game in Task 10.
- **Hidden zones stay hidden.** The Bench, the Backlog and the research row never show a face to another seat, including the moment the Crash passes through the research row. Test in Task 9b, and after every move of the long runs in Task 10.

---

### Task 1: Counters and facts under `Players:`, and a page that draws only what a game has

**Files:**
- Modify: `src/engine/core/lang/compile.ts` (`readPlayers`, `compileBoard`, `acceptFacts`, `compile`)
- Modify: `src/engine/core/lang/testing.ts` (new `COUNTER_GAME`)
- Modify: `src/pages/designer/board-grid.tsx` (`data-testid="board-grid"` on `BoardGrid`'s root), `src/pages/designer/playtest.tsx`
- Test: `src/engine/core/lang/compile.test.ts`, `src/engine/core/lang/board-view.test.ts`, `src/pages/designer/playtest.test.tsx`

**Interfaces:**
- **`compile.ts`:**
  - `readPlayers(lines: Section[], diagnostics: Diagnostic[]): { players: { min: number; max: number } | null; lines: OutlineNode[] }`. The first `Players:` line keeps its children and returns them as `lines`; a second one is reported as before, and its children are rejected.
  - `compileBoard(sections: Section[], playerLines: OutlineNode[], maxPlayers: number, stage, declared): BoardSpec | null` reads `playerLines` first, then the Board: lines, with the same per-line vocabulary.
    - With no Board: section and no player lines it gives null.
    - With no Board: section it gives `{ spaces: [], … }` and needs no loop.
    - With a Board: section it needs a loop as before (`NO_LOOP`).
    - A loop line among the player lines is reported with `The board goes under a Board: section, not under Players:.` and left out.
  - `acceptFacts(…, hasBoard: boolean, …)`: `hasBoard` is `of('board').length > 0 || playerLines.length > 0`. The two messages become:
    - `NO_BOARD_FOR_PLAYER_FACTS = 'Facts about players need a Board: section or lines under Players:.'`
    - `NO_BOARD_FOR_GAME_NUMBERS = 'Numbers that belong to the game need a Board: section or lines under Players:.'`
  - Phrases that need a board stay refused, since `vocab.spaces` is empty.
- **`playtest.tsx`:** the panel layout (status, banner, then the parts below, then the card table) is used when `extras.board !== null` or the game declares any button (`game.phases.some((p) => p.actions.length > 0)`). In it:
  - `BoardGrid` only when `extras.board.spaces.length > 0`;
  - `MoneyLine` only when there is a board and `extras.board.counters.length > 0 || game.facts.length > 0`;
  - `ActionButtons` only when the game declares a button.
  - Otherwise the plain card layout, as today.
- **`testing.ts`:** `COUNTER_GAME`, written as below. Later tasks build on it.

```ts
/**
 * A card game with a number each player has and no board, its lines indented under Players:. Players buy gems from a shop row
 * for 1 coin, or pass. `Players: 2 to 3` is line 2, `A player may buy a card from the shop to their stash.` line 22, `They pay 1.`
 * line 24 and `A player may pass.` line 25.
 */
export const COUNTER_GAME = [
  'Game: Gem Shop', 'Players: 2 to 3', '  Each player has 7 coins that everyone can see.', '  Players pay with coins.', '',
  'Cards:', '  A deck called gems, starting in the pile:', '    | name | cost | copies |', '    | Ruby | 3    | 4      |', '    | Opal | 1    | 4      |', '',
  'Table:', '  The pile is a pile in the center that no one can see.', '  The shop is a row in the center that everyone can see.',
  '  Each player has a stash row that only they can see.', '',
  'Setup:', '  Deal 2 cards from the pile to the shop.', '',
  'Phase: shopping', '  Players take turns.', '  A player may buy a card from the shop to their stash.', '    Then:', '      They pay 1.',
  '  A player may pass.', '  After a player buys or passes, the turn passes to the left.', '',
  'End:', '  The game ends when the pile is empty.', '  The highest score wins.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**

In `compile.test.ts`, add `describe('counters and facts under Players:')`:
- **Read as a board with no spaces.** `COUNTER_GAME` compiles with `diagnostics` `[]`. `game.board` matches `{ spaces: [], pieces: null, dice: null, payWith: 'coins', bank: [] }`, and its counters match `[{ name: 'coins', start: 7, visibility: 'public' }]`. Use `toMatchObject`, since Task 2 adds a field.
- **Played.** `createEngine(game, lib, 2, initialState(game, 1))`: p0 has 7 coins. p0 buys the shop's first card (`{ type: 'buy', by: 'p0', cardId }`), which is accepted and leaves p0 at 6 and p1 at 7.
- **Facts.** With `'  Players can be lucky.\n  The game has a pot of 0.'` added after line 4, `diagnostics` is `[]` and `game.facts` equals `[{ name: 'lucky', on: 'player', kind: 'flag' }, { name: 'pot', on: 'game', kind: 'number', start: 0 }]`.
- **No loop under Players:.** With `'  The board is a loop of spaces, starting at Go:'` and its four-row space table added under `Players:`, the errors include `[3, 'The board goes under a Board: section, not under Players:.']`.
- **Both blocks.** `TINY_BOARD_HEAD.replace('Players: 2 to 4', 'Players: 2 to 4\n  Each player has 3 lives that everyone can see.')` compiles with no errors, and the counter names are `['lives', 'money']`.
- **A phrase that needs a board** stays refused. `COUNTER_GAME.replace('      They pay 1.', '      They pay 1.\n      They own it.')` reports `“They own it” needs a board. Add a Board: section with a line like “The board is a loop of spaces, starting at Go:”.` on line 25.
- **Existing tests.** In `refuses a fact about players in a game with no board …` and `refuses a number of the game in a game with no board …`, change the expected messages to the two new ones above.

In `board-view.test.ts`, add **a board with no spaces**:
- `seatExtras` of a two-player `COUNTER_GAME` engine has a board matching `{ spaces: [], pieces: {}, counters: [{ name: 'coins', values: { p0: 7, p1: 7 } }] }`.
- `readSeatExtras` of it is not null.

In `playtest.test.tsx`, add `describe('Playtest of a game with counters and no board')`, with `const gemShop = compileGame(COUNTER_GAME, lib).game!`:

```ts
it('draws the money line, the buttons and the card table, and no board', () => {
  mount({ game: gemShop, players: 2 });
  expect(screen.queryAllByTestId('board-grid')).toHaveLength(0);
  expect(screen.getAllByText('p0 7 coins')).toHaveLength(2);
  expect(screen.getAllByRole('button', { name: 'Pass' })).toHaveLength(2);
  expect(rendered).toBeGreaterThan(0);
});
it('draws buttons for a card game with no numbers at all, and no money line', () => {
  const plain = compileGame(COUNTER_GAME.replace('  Each player has 7 coins that everyone can see.\n  Players pay with coins.\n', '').replace('    Then:\n      They pay 1.\n', ''), lib);
  expect(plain.diagnostics).toEqual([]);
  mount({ game: plain.game!, players: 2 });
  expect(screen.getAllByRole('button', { name: 'Pass' })).toHaveLength(2);
  expect(screen.queryByText(/coins/)).toBeNull();
});
```

In the existing `describe('Playtest of a board game')`, add `expect(screen.getAllByTestId('board-grid')).toHaveLength(3)` to the first test.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile.test.ts src/engine/core/lang/board-view.test.ts src/pages/designer/playtest.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the three files and `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/compile.ts src/engine/core/lang/testing.ts src/pages/designer/board-grid.tsx src/pages/designer/playtest.tsx \
  src/engine/core/lang/compile.test.ts src/engine/core/lang/board-view.test.ts src/pages/designer/playtest.test.tsx
git commit -m "feat(lang): counters, payments and facts indented under Players: for a game with no board, and a playtest that draws only what a game has"
```

---

### Task 2: A per-turn budget

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`CounterSpec.perTurn`)
- Modify: `src/engine/core/lang/library/board-phrases.ts` (the counter board phrases, two effects)
- Modify: `src/engine/core/lang/refs.ts` (`COUNTER`)
- Modify: `src/engine/core/lang/testing.ts` (`fixtureBoardGame`'s counter gains `perTurn: false`)
- Test: `src/engine/core/lang/library/board-phrases.test.ts`, `src/engine/core/lang/compile.test.ts` (two counter literals), `src/engine/core/lang/refs.test.ts`

**Interfaces:**
- **`types.ts`:** `CounterSpec = { name: string; start: number; visibility: 'public' | 'owner'; perTurn: boolean }`. `perTurn` is true for a counter that goes back to its start at the start of each of its owner's turns. Task 4 does the reset.
- **`board-phrases.ts`:**
  - The `counter` board phrase sets `perTurn: false`.
  - Board `'each player has {int} {name} each turn'` gives `{ kind: 'counter', counter: { name, start, visibility: 'public', perTurn: true } }`.
  - Effect `'they spend {int} {counter}'` (needsPlayer) takes `n` off their counter. Spending more than they have, or less than 0, is a RuleError: `` `They have ${counted(have, counter)}, so they can't spend ${n}.` ``.
  - Effect `'their {counter} go back to {int}'` (needsPlayer) sets their counter to the number.
- **`refs.ts`:** `COUNTER` also reads the singular of a plural counter name and resolves it to the declared name, as `declaredWord(…, singulars: true, anyText: true)` does. So "1 action" is `actions`, and "money" is unchanged.

- [ ] **Step 1: Write the failing tests.**

In `library/board-phrases.test.ts`, add `describe('a budget each turn')`. `BUDGET` is `COUNTER_GAME` with `'  Each player has 2 moves each turn.'` after line 3, and with `'  A player may rest.\n    Only if they have at least 1 move.\n    Then:\n      They spend 1 move.\n'` before `'  A player may pass.'`.
- **Compiled.** `diagnostics` is `[]`. The counters equal `[{ name: 'coins', start: 7, visibility: 'public', perTurn: false }, { name: 'moves', start: 2, visibility: 'public', perTurn: true }]`.
- **Singular names.** With `vocabFor(budget)`:
  - `lib.match('condition', 'they have at least 1 move', vocab)` is ok with args `[1, 'moves']`;
  - `'they spend 1 move'` is ok with args `[1, 'moves']`;
  - `lib.match('given', 'p0 has 1 move', vocab)` is ok.
- **Spending,** about p0 with 2 moves:
  - `they spend 1 move` leaves 1;
  - `they spend 2 moves` leaves 0;
  - `they spend 3 moves` throws `They have 2 moves, so they can't spend 3.`;
  - `they spend -1 moves` throws `They have 2 moves, so they can't spend -1.`
- **Going back.** `their moves go back to 0` leaves 0, and `their coins go back to 3` leaves 3.
- **Needs.** Both effects match `{ needsPlayer: true }`.
- **On the engine.** p0 rests twice, and a third rest is refused with `'they have at least 1 move'`.

Update the existing counter literals: `compile.test.ts` (around lines 601 and 668), `library/board-phrases.test.ts` (around lines 299 and 461) and `fixtureBoardGame` each gain `perTurn: false`.

In `refs.test.ts`, add: `parseParam('counter', 'action', vocabFrom({ maxPlayers: 2, board }))` gives `{ value: 'actions' }` for a board whose counters are `actions` and `money`, and `'money'` still gives `{ value: 'money' }`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/board-phrases.test.ts src/engine/core/lang/refs.test.ts src/engine/core/lang/compile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the three files and `bunx vitest run src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/library/board-phrases.ts src/engine/core/lang/refs.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/library/board-phrases.test.ts src/engine/core/lang/compile.test.ts src/engine/core/lang/refs.test.ts
git commit -m "feat(lang): a number each player has each turn, spending it, setting it back, and counters named in the singular"
```

---

### Task 3: Turn steps: "they" is the player whose turn it is, the turn passes as an effect, and a start player

**Files:**
- Create: `src/engine/core/lang/turns.ts`
- Create: `src/engine/core/lang/library/turn-phrases.ts` (`registerTurnPhrases`, added to `REGISTRARS` right after `registerPickPhrases`)
- Modify: `src/engine/core/lang/compile-phase.ts` (`compilePhase`, `compileTrigger`)
- Modify: `src/engine/core/lang/runtime.ts` (`turnSubject`, `testInPhase`, `runInPhase`, `triggerSubject`)
- Modify: `src/engine/core/lang/build.ts` (`flowDefFor`, `flowRegistryFor`)
- Modify: `src/engine/core/lang/library/flow-phrases.ts` (`startPhase`)
- Modify: `src/engine/core/lang/board-view.ts` (`BoardView.startPlayer`, `isBoard`)
- Modify: `src/engine/core/lang/library/index.ts`, `src/engine/core/lang/testing.ts` (new `TURN_GAME`)
- Modify: hand-built `BoardView`s gain `startPlayer: null`: `board-view.test.ts`, `src/pages/designer/board-parts.test.tsx` (`board()`), `src/pages/designer/seat-status.test.ts` (`boardExtras`)
- Test: `src/engine/core/lang/compile-phase.test.ts`, `src/engine/core/lang/runtime.test.ts`, `src/engine/core/lang/library/turn-phrases.test.ts` (new), `src/engine/core/lang/library/flow-phrases.test.ts`, `src/engine/core/lang/board-view.test.ts`

**Interfaces:**
- **`turns.ts`** (rounds and turns: the start player, and in later tasks the round count and the turn marker):
  - `START_PLAYER_KEY = 'lang:start-player'`;
  - `START_PLAYER_PHRASE = 'the start player is chosen at random'`;
  - `startPlayerOf(state: GameState, seats: PlayerId[]): PlayerId` gives the seat the state holds under the key when it is one of `seats`, else `seats[0]`.
- **`compile-phase.ts`:**
  - `compilePhase` first works out `turnTaking`: the last of the phase's "Players take turns" / "Everyone acts at once" lines, if any, is not "Everyone acts at once".
  - In a turn-taking phase, three kinds of line are read with `{ ...ctx, player: true }`: the `When this phase starts:` lines, the `go to` condition, and a `When …:` rule that is not about a player or a card (its `when` and its body).
  - `compileTrigger(node, clean, whenText, ctx, aboutTurn: boolean)`: `aboutTurn` turns this on.
  - A phase where everyone acts at once reads them as before.
- **`runtime.ts`:**
  - `turnSubject(phaseId: string, state: GameState): Subject` is `{ player: state.turn?.current ?? null, space: null, card: null }` for a phase whose `actor` is `'current'`, else the subject about no one.
  - `testInPhase(phaseId, ref, state): boolean` and `runInPhase(phaseId, ref, state): GameState` test and run a ref about `turnSubject(phaseId, state)`.
  - `triggerSubject`'s rule about no one in particular is about `turnSubject(phaseId, state)`.
- **`build.ts`:**
  - A phase's `advance.when` becomes `{ name: 'lang:phase-cond', params: { phase: phase.id, ref: goTo.when } }`.
  - Its `onEnter` entries become `{ name: 'lang:phase-effect', params: { phase: phase.id, ref } }`.
  - `flowRegistryFor` registers both through `testInPhase` and `runInPhase`.
  - Setup keeps `lang:effect`.
- **`flow-phrases.ts`:** `startPhase` runs the started phase's start lines about `{ player: next, space: null, card: null }` when that phase's actor is `'current'`, and about no one otherwise.
- **`library/turn-phrases.ts`:**
  - Effect `'the turn passes to the left'`: the next seat still in (`nextIn`; a lone seat keeps the turn) becomes current through `chooseNext`, and the phase becomes `env.game.phases[0].id`. It runs no phase's start lines (C1). Without a turn it throws RuleError `There is no turn to pass.`
  - Effect `START_PLAYER_PHRASE`: `nextInt(state.rng, seats.length)` picks a seat, stores it under `START_PLAYER_KEY` with the rng moved on, and makes it current through `chooseNext`.
  - Given `'{player} is the start player'` stores the seat under `START_PLAYER_KEY`.
- **`board-view.ts`:** `BoardView.startPlayer: PlayerId | null` is the seat the state holds under `START_PLAYER_KEY`, or null. `isBoard` requires null or text.
- **`testing.ts`:** `TURN_GAME`, written as below. Tasks 4 and 5 build on it.

```ts
/**
 * A card game whose turn is a run of steps, written the way a designer would. Each player has 2 moves each turn, and a start player
 * is chosen at random. Working and taking a card each spend a move; once a player has none left the turn goes to tidying, whose
 * start line gives them a coin, and once their list has fewer than 2 cards the turn passes to the left with no press.
 */
export const TURN_GAME = [
  'Game: Chores', 'Players: 2 to 4', '  Each player has 0 coins that everyone can see.', '  Each player has 2 moves each turn.',
  '  Players pay with coins.', '',
  'Cards:', '  A deck called chores, starting in the pile:', '    | name  | copies |', '    | Sweep | 6      |', '    | Dust  | 6      |', '',
  'Table:', '  The pile is a pile in the center that no one can see.', '  The done pile is a pile in the center that everyone can see.',
  '  Each player has a list row that only they can see.', '',
  'Setup:', '  The start player is chosen at random.', '',
  'Phase: working', '  Players take turns.',
  '  A player may work.', '    Only if they have at least 1 move.', '    Then:', '      They spend 1 move.', '      They get 1 coin.',
  '  A player may take a card from the pile to their list.', '    Only if they have at least 1 move.', '    Then:', '      They spend 1 move.',
  '  A player may stop.', '    Then:', '      Their moves go back to 0.',
  '  When they have less than 1 move, go to tidying.', '',
  'Phase: tidying', '  When this phase starts:', '    They get 1 coin.',
  '  A player may finish a card from their list to the done pile.', '    Only if their list has more than 1 card.',
  '  When their list has fewer than 2 cards:', '    The turn passes to the left.', '',
  'End:', '  The game ends when the pile is empty.', '  The highest score wins.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.** `at(text, line)` is the 1-based number of `line` in `text`.

In `compile-phase.test.ts`, add `describe('“they” in a phase where players take turns')`:
- `TURN_GAME` compiles with `diagnostics` `[]`.
- Working's `goTo.when` matches `{ kind: 'condition', phrase: 'they have less than {int} {counter}', args: [1, 'moves'] }`.
- Tidying's start line matches `{ kind: 'effect', args: [1, 'coins'] }`.
- Tidying's rule's `when` matches `{ kind: 'condition', phrase: '{zone} has fewer than {int} cards' }`.
- **Everyone at once.** `TURN_GAME.replace('Phase: tidying\n', 'Phase: tidying\n  Everyone acts at once.\n')` reports `[at(…, '  When their list has fewer than 2 cards:'), '“their list has fewer than 2 cards” only makes sense in a rule about a player\'s move.']`, and the start line `They get 1 coin` with the needs-a-player message.

In `runtime.test.ts`, add `describe('turn steps')`. The engine is `createEngine(game, lib, players, initialState(game, seed))`; `s` is its start player and `next(s)` the seat on its left.
- **The start player** is `state.data['lang:start-player']`, and the turn is `{ current: s, phase: 'working' }`. Over seeds 1 to 12 at 3 players at least 2 seats start. The same seed gives the same seat.
- **Steps with no press.** `s` works twice. The turn is then `{ current: next(s), phase: 'working' }`. `s` has 3 coins (2 from work, 1 from tidying's start line), and `next(s)` has 0 coins and 2 moves.

In the new `library/turn-phrases.test.ts`:
- **Passing.** On a 3-seat fixture state at `{ current: 'p0', phase: 'tidying' }` with p1 out (`markOut`), `the turn passes to the left` gives `turn` `{ current: 'p2', phase: 'working', chosen: true }`. From p2 it gives p0. It leaves the turn log empty.
- **No start lines (C1).** Add `'  When this phase starts:\n    They get 5 coins.'` after working's `Players take turns.` in `TURN_GAME`. Then `the turn passes to the left` from `{ current: 'p0', phase: 'tidying' }` leaves every coin as it was.
- **The start player.** `the start player is chosen at random` on a state at `{ current: 'p0', phase: '__setup' }` stores a seat of the table and makes it current. The rng has moved on. The same rng gives the same seat.
- **Given.** `p1 is the start player` stores `'p1'`.

In `library/flow-phrases.test.ts`, in slice 6's `describe('a phase that interrupts the turn')`:
- `INTERRUPT_BOARD.replace('    Every player is voting.', '    They are voting.')` compiles with no diagnostics.
- After p0 rolls and calls a vote, p1 is voting and p0 and p2 are not (`playerFact` is not `true`).

In `board-view.test.ts`:
- A `TURN_GAME` engine's board view has `startPlayer` equal to its start player.
- Rent Day's is `null`.
- `readSeatExtras` gives null for `startPlayer: 3`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/runtime.test.ts src/engine/core/lang/library/turn-phrases.test.ts src/engine/core/lang/library/flow-phrases.test.ts src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the same files and `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`. The four games pass unchanged: their plain rules and start lines now run about the current player, and none of their phrases reads it.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/turns.ts src/engine/core/lang/library/turn-phrases.ts src/engine/core/lang/compile-phase.ts src/engine/core/lang/runtime.ts \
  src/engine/core/lang/build.ts src/engine/core/lang/library/flow-phrases.ts src/engine/core/lang/board-view.ts src/engine/core/lang/library/index.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/runtime.test.ts \
  src/engine/core/lang/library/turn-phrases.test.ts src/engine/core/lang/library/flow-phrases.test.ts src/engine/core/lang/board-view.test.ts \
  src/pages/designer/board-parts.test.tsx src/pages/designer/seat-status.test.ts
git commit -m "feat(lang): “they” is the player whose turn it is in a phase where players take turns, the turn passes as an effect, and a seeded start player"
```

---

### Task 4: Rounds and turns that start by themselves, and rules for every phase

**Files:**
- Modify: `src/engine/core/lang/turns.ts`, `src/engine/core/lang/types.ts` (`EveryPhase`, `CompiledGame.everyPhase`, `CompiledPhase.turnStarts`)
- Modify: `src/engine/core/lang/compile.ts` (the section, `compileEveryPhase`, `warnUnreachable`'s lines, the C3 warning)
- Modify: `src/engine/core/lang/compile-phase.ts` (phase turn-start rules, `export compileTrigger`, `startsLineOf`)
- Modify: `src/engine/core/lang/runtime.ts` (`triggerSubject`, `fireTrigger`, `turnWaiting`, `startTurn`)
- Modify: `src/engine/core/lang/build.ts` (the turn trigger, every-phase triggers, card rules)
- Modify: `src/engine/core/lang/examples.ts` (the arranged turn, `setUp`), `src/engine/core/lang/library/example-phrases.ts` (`turnIs`)
- Modify: `src/engine/core/lang/testing.ts` (`fixtureGame`'s `everyPhase`, `fixturePhase`'s `turnStarts`, new `ROUNDS_GAME`), `src/engine/core/lang/zones.test.ts` (its `GAME` literal)
- Test: `src/engine/core/lang/compile.test.ts`, `src/engine/core/lang/runtime.test.ts`, `src/engine/core/lang/examples.test.ts`

**Interfaces:**
- **`turns.ts`:**
  - `TURN_OF_KEY = 'lang:turn-of'`: the seat whose turn has started.
  - `ROUND_KEY = 'lang:round'`: how many rounds have started.
  - `roundOf(state): number` gives 0 when unset.
  - `markTurnStarted(state): GameState` sets `TURN_OF_KEY` to `state.turn.current` and `ROUND_KEY` to at least 1.
  - `clearTurnMarkers(state): GameState` removes `TURN_OF_KEY`, `ROUND_KEY` and `START_PLAYER_KEY`.
  - `usesTurns(game: Pick<CompiledGame, 'board' | 'setup' | 'everyPhase' | 'end' | 'phases'>): boolean` is true when any of these holds:
    - a counter is `perTurn`;
    - a Setup line is `START_PLAYER_PHRASE` (read through `innerEffect`);
    - `everyPhase.roundStarts` or `everyPhase.turnStarts` is not empty;
    - some phase has `turnStarts`.
    - Task 5 adds the round frame.
- **`types.ts`:**
  - `EveryPhase = { triggers: CompiledTrigger[]; roundStarts: PhraseRef[]; turnStarts: PhraseRef[] }`;
  - `CompiledGame.everyPhase: EveryPhase`, empty lists when there is no such section;
  - `CompiledPhase.turnStarts: PhraseRef[]`: the "When a player's turn starts:" lines written under the phase.
- **`compile.ts`:**
  - `'In every phase'` joins `SECTION_NAMES` right after `'Setup'`, and `BLOCK_SECTIONS` as `'in every phase'`. The unknown-section message then lists "…, Setup, In every phase, Phase, End and Example, …".
  - `compileEveryPhase(sections: Section[], ctx: LineCtx): EveryPhase` reads each line:
    - `When a round starts:` (`/^when a round starts:?$/i`): its lines are effects about no one;
    - `When a player's turn starts:` (any apostrophe): its lines are effects about the player (`player: true`);
    - any other `When …:` line: `compileTrigger(node, clean, whenText, ctx, false)`;
    - anything else is reported: `` 'Only “When …:” rules go under In every phase:, like “When the shop has fewer than 4 cards:”.' ``
  - `warnUnreachable`'s `elsewhere` also takes the every-phase effects. Each phase's `turnStarts` count among its own lines in `effectsOf`.
  - **C3.** When `usesTurns(…)` and the first phase has a `When this phase starts:` line, add a warning on that line:
    `` 'This phase comes first, so its “When this phase starts:” lines run only on the game's first turn. Put what starts each turn under “When a player's turn starts:”.' ``
    - `startsLineOf(node: OutlineNode): number | null`, exported from `compile-phase.ts`, finds the line.
- **`compile-phase.ts`:** in a phase, `When a player's turn starts:` is checked before moments and triggers. Its lines go to `phase.turnStarts`, read with `{ ...ctx, player: true }` (C2).
- **`runtime.ts`:**
  - `triggerSubject(phaseId: string | null, trigger, state)` and `fireTrigger(phaseId: string | null, …)`. A null phase is an every-phase rule: it holds in any phase the game declares, never in Setup, and a rule about no one in particular is about no one.
  - `turnWaiting(state): boolean` is true when all of these hold:
    - the game has no result;
    - the phase is one the game declares;
    - no turn is interrupted;
    - `state.data[TURN_OF_KEY] !== state.turn.current`.
  - `startTurn(state): GameState`, for `seat = state.turn.current` and `phase` its phase, in order:
    1. If `seat === startPlayerOf(state, seats)`, `ROUND_KEY` goes up by 1, then `everyPhase.roundStarts` run about no one.
    2. Each `perTurn` counter of `seat` goes back to its start.
    3. `everyPhase.turnStarts` run about `seat`, then `phase`'s `turnStarts` about `seat` (C2).
    4. `TURN_OF_KEY` becomes `seat`.
- **`build.ts`:**
  - When `usesTurns(game)`, `triggers` starts with `{ id: 'a turn starts', when: { name: 'lang:turn-waiting' }, then: [{ name: 'lang:turn-start' }] }`, registered through `turnWaiting` and `startTurn`.
  - Then come the every-phase triggers (`id` `line N: text`, params `{ phase: null, trigger }`), then the phase triggers as before. `TriggerParams.phase` is `string | null`.
  - Every-phase rules about a card join `cardRules` with `phase: null`.
  - The trigger is never part of the pass effect: End is checked before triggers, which makes the window after the last pass (R1.3).
- **`examples.ts`:**
  - The example's first table is passed through `markTurnStarted` when `usesTurns(game)`.
  - `setUp` builds from `clearTurnMarkers({ ...state, turn: undefined })`.
- **`example-phrases.ts`:** `turnIs` also sets `TURN_OF_KEY` to the seat when `usesTurns(env.game)`, so an arranged turn has started (R1.6).
- **`testing.ts`:**
  - `fixtureGame` gains `everyPhase: { triggers: [], roundStarts: [], turnStarts: [] }`, and `fixturePhase` gains `turnStarts: []`.
  - `ROUNDS_GAME` is `TURN_GAME` with this section inserted before `Phase: working`:

```text
In every phase:
  When a round starts:
    Move the top card of the pile to the done pile.
  When a player's turn starts:
    They get 1 coin.
  When the done pile has more than 2 cards:
    Move the done pile to the pile.
```

- [ ] **Step 1: Write the failing tests.**

In `compile.test.ts`, add `describe('In every phase:')`:
- `ROUNDS_GAME` compiles with `diagnostics` `[]`.
- `everyPhase.roundStarts` has one effect, `turnStarts` one with args `[1, 'coins']`, and `triggers` one whose `when` matches `{ phrase: '{zone} has more than {int} card(s)' }`.
- A `'  Players take turns.'` line in the section reports the "Only “When …:” rules …" message on its line.
- `They get 1 coin.` under `When a round starts:` reports the needs-a-player message.
- **The C3 warning.** `ROUNDS_GAME` with `'  When this phase starts:\n    They get 5 coins.'` after `'  Players take turns.'` of working gives exactly one diagnostic: that warning, on the `When this phase starts:` line. The same lines in `COUNTER_GAME`'s first phase give none.
- A phase's own `When a player's turn starts:` compiles into `phases[i].turnStarts`.
- **Existing tests.** Update the three unknown-section messages.

In `runtime.test.ts`, add `describe('rounds and turns')`. `table(players)` is a `ROUNDS_GAME` engine on `{ ...initialState(game, 1), turn: { current: 'p0', phase: 'working' } }`, so Setup is skipped and p0, the first seat, starts.
- **Built.** Round 1, `TURN_OF_KEY` p0, p0 at 1 coin and the others at 0, and the done pile holds 1 card.
- **p0 stops.** p0 has 2 coins (turn start and tidying). It is p1's turn, p1 has 1 coin, and the round is 1.
- **p1 and p2 stop.** It is p0's turn, the round is 2, the done pile holds 2, and p0's moves are back at 2 after `stop` set them to 0. p0 has 3 coins.
- **A third round** starts with 3 cards in the done pile, so the every-phase rule moves them to the pile: the done pile is empty, in working.
- **A phase's own turn-start rules, after the every-phase ones (C2).** With `'  When a player\'s turn starts:\n    If they have at least 1 coin, they get 10 coins.'` under working, p1's turn starts with 11 coins. The every-phase line ran first; the other way round p1 would have 1.
- **Waiting.** `runtime.turnWaiting` is false while `lang:interrupted` holds a turn, in the setup phase, and once a result is set.
- **Untouched games.** `flowDefFor` of `TEST_DUEL` has no trigger with id `'a turn starts'`. `ROUNDS_GAME`'s first trigger has it, and its second is the every-phase rule.

In `examples.test.ts`, add `describe('examples in a game with rounds')`. Compile `ROUNDS_GAME` with these appended; all pass:

```text
Example: an arranged turn has already started
  Given p0 has 1 move
  When p0 works
  Then it is p1's turn
  And p0 has 2 coins
  And p1 has 1 coin
  And p1 has 2 moves

Example: each round starts with the start player
  Given 3 players
  And p1 is the start player
  And it is p1's turn
  When p1 stops
  Then it is p2's turn
  When p2 stops
  And p0 stops
  Then it is p1's turn
  And the done pile has 1 card

Example: setting up starts the first round once
  Given the game is set up
  Then the done pile has 1 card

Example: a step that finishes the turn
  Given the turn passes to the left
  When p1 stops
  Then it is p0's turn
  And p1 has 2 coins
```

How the numbers come:
- In the first, p0 works with the 1 move arranged: it was not reset, so the turn moves on. 1 coin from work and 1 from tidying.
- In the second, the arranged turn of p1 starts no round. p1's next turn is round 2's start, which moves one card.
- In the last, the Given passes from p0 to p1 and p1's turn starts on the rebuild: 1 coin. Stopping adds tidying's 1.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile.test.ts src/engine/core/lang/runtime.test.ts src/engine/core/lang/examples.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the three files and `bunx vitest run src/games src/pages/designer`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/turns.ts src/engine/core/lang/types.ts src/engine/core/lang/compile.ts src/engine/core/lang/compile-phase.ts \
  src/engine/core/lang/runtime.ts src/engine/core/lang/build.ts src/engine/core/lang/examples.ts src/engine/core/lang/library/example-phrases.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/zones.test.ts src/engine/core/lang/compile.test.ts src/engine/core/lang/runtime.test.ts \
  src/engine/core/lang/examples.test.ts
git commit -m "feat(lang): rounds and turns that start by themselves from the start player, a budget reset each turn, and rules for every phase"
```

---

### Task 5: The End waits for the round, points per counter, and tied players share the win

**Files:**
- Modify: `src/engine/core/lang/turns.ts` (`ROUND_FRAME`, `roundFinished`, `usesTurns`)
- Modify: `src/engine/core/lang/compile.ts` (`compileEnd`), `src/engine/core/lang/runtime.ts` (`test`, `result`), `src/engine/core/lang/types.ts` (`WinnerFn`)
- Modify: `src/engine/core/lang/library/flow-phrases.ts` (the tie winner), `src/engine/core/lang/library/board-phrases.ts` (the per-N score)
- Modify: `src/engine/core/lang/refs.ts` (`PLAYERS`), `src/engine/core/lang/library/example-phrases.ts`, `src/pages/designer/seat-status.ts`
- Test: `src/engine/core/lang/compile.test.ts`, `src/engine/core/lang/runtime.test.ts`, `src/engine/core/lang/library/flow-phrases.test.ts`, `src/engine/core/lang/library/board-phrases.test.ts`, `src/engine/core/lang/library/example-phrases.test.ts`, `src/pages/designer/seat-status.test.ts`

**Interfaces:**
- **`turns.ts`:**
  - `ROUND_FRAME = 'round'`.
  - `roundFinished(state, seats): boolean` holds when all of these do:
    - `roundOf(state) >= 1`;
    - `state.turn.current === startPlayerOf(state, seats)`;
    - `TURN_OF_KEY` is not the current seat;
    - no turn is interrupted.
  - `usesTurns` is also true when `game.end?.when` is a `lang` ref with phrase `ROUND_FRAME`.
- **`compile.ts`:** in `compileEnd`, a "The game ends when …" body that ends in "and the round is finished" (`/^(.+?)\s+and the round is finished$/i`, on the normalized body) compiles as `{ kind: 'lang', phrase: ROUND_FRAME, args: [matchLine('condition', X, …)], line, text }`. Conditions have no "and" (R1.5).
- **`runtime.ts`:**
  - `test` of a `ROUND_FRAME` ref is `test(X) && roundFinished(state, seats)`.
  - `result`: a winner phrase may give a list. Then the result is `{ scores, winner: list[0], winners: list }`; an empty list throws. Every other result is as before, so Hearts is unchanged.
- **`types.ts`:** `WinnerFn = (env, args, scores) => PlayerId | PlayerId[]`.
- **`flow-phrases.ts`:** winner `'the highest score wins, and tied players share the win'` gives every seat with the top score, in seat order.
- **`board-phrases.ts`:** score `'each player scores {int} point(s) for every {int} {counter}'` is `Math.floor(counter / every) * points`. `every` below 1 is a RuleError `Say a number of 1 or more after “for every”.`
- **`refs.ts`:** `PLAYERS`, type `'players'`, label `'[players]'`: one or more seats joined by the list separators ("p0 and p1", "p0, p1 and p2"), each read as `{player}` is. Added to `VOCAB_TYPES`.
- **`example-phrases.ts`:**
  - Expect `'the game is over'` and `'the game is not over'`.
  - Expect `'{players} win'` holds when the result's winners (its `winners`, else `[winner]`) are exactly those seats.
  - `{player} wins` now fails on a shared win with `` `Expected ${seat} to win alone, but ${joinAnd(winners)} share the win.` ``
- **`seat-status.ts`:** with `winners` of two or more, the headline is `` `Game over — ${joinAnd(winners)} win` ``, scores as before: `Game over — p0 and p1 win (p0 3, p1 3, p2 1)`.

- [ ] **Step 1: Write the failing tests.** `ENDING` is `ROUNDS_GAME` with its End lines replaced by:

```text
End:
  The game ends when the done pile is not empty and the round is finished.
  Each player scores 1 point for every 2 coins.
  The highest score wins, and tied players share the win.
```

In `compile.test.ts`:
- `ENDING` compiles with `[]`.
- `game.end.when` matches `{ kind: 'lang', phrase: 'round', args: [{ kind: 'condition', phrase: '{zone} is not empty' }] }`.
- `'the done pil is not empty and the round is finished'` reports the misnamed zone on its line.

In `runtime.test.ts`, add `describe('an End that waits for the round')`, with an `ENDING` engine started at p0 as in Task 4, 3 players:
- **Mid-round.** After p0 and p1 stop, there is no result, though the done pile is not empty.
- **The round's end.** After p2 stops, there is a result:
  - round 1, current p0, `TURN_OF_KEY` p2, and the done pile holds 1 card: round 2 never started.
  - Coins are p0 2, p1 2, p2 2; scores 1 each; `winners` `['p0', 'p1', 'p2']` and `winner` `'p0'`.
- **No start lines in the window (C1).** `ENDING` with `'  When this phase starts:\n    They get 5 coins.'` under working's `Players take turns.` compiles with only the C3 warning, and the same round ends with p0 at 2 coins.
- **A lone winner.** p0 works twice instead of stopping, then p1 and p2 stop. p0 ends with 4 coins (1 at its turn start, 2 from work, 1 from tidying), so 2 points; p1 and p2 have 2 coins, so 1 point each. `winners` is `['p0']`.
- **Hearts unchanged.** `TEST_DUEL`'s result after the game ends has no `winners` key (use the existing end-of-game test's state).

In `library/flow-phrases.test.ts`: `the highest score wins, and tied players share the win` with scores `{ p0: 3, p1: 5, p2: 5 }` gives `['p1', 'p2']`. With `{ p0: 1 }` and seats p0, p1 it gives `['p0']`.

In `library/board-phrases.test.ts`, the score `each player scores 1 point for every 5 money` gives:
- 0 at 4 money, 1 at 5, 1 at 9, 300 at 1500;
- `for every 0 money` throws the message.

In `library/example-phrases.test.ts`:
- On a result `{ scores: { p0: 2, p1: 2, p2: 1 }, winner: 'p0', winners: ['p0', 'p1'] }`:
  - `p0 and p1 win` is true;
  - `p0 wins` gives `Expected p0 to win alone, but p0 and p1 share the win.`;
  - `p0, p1 and p2 win` fails;
  - `the game is over` is true.
- Without a result, `the game is not over` is true and `the game is over` fails.
- On `{ winner: 'p0' }`, `p0 win` is true.

In `seat-status.test.ts`: a view whose result has `winners: ['p0', 'p1']` and scores `{ p0: 3, p1: 3, p2: 1 }` reads `Game over — p0 and p1 win (p0 3, p1 3, p2 1)`. A result with one winner reads as before.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang src/pages/designer/seat-status.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the same, `bunx vitest run src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/turns.ts src/engine/core/lang/compile.ts src/engine/core/lang/runtime.ts src/engine/core/lang/types.ts \
  src/engine/core/lang/library/flow-phrases.ts src/engine/core/lang/library/board-phrases.ts src/engine/core/lang/refs.ts \
  src/engine/core/lang/library/example-phrases.ts src/pages/designer/seat-status.ts src/engine/core/lang/compile.test.ts \
  src/engine/core/lang/runtime.test.ts src/engine/core/lang/library/flow-phrases.test.ts src/engine/core/lang/library/board-phrases.test.ts \
  src/engine/core/lang/library/example-phrases.test.ts src/pages/designer/seat-status.test.ts
git commit -m "feat(lang): an End that waits for the round to finish, points for every N of a counter, and tied players sharing the win"
```

---

### Task 6: Card moves that pay what the card says

**Files:**
- Modify: `src/engine/core/lang/library/move-phrases.ts`
- Test: `src/engine/core/lang/library/move-phrases.test.ts`

**Interfaces:**
- Consumes `COUNTER_GAME` (Task 1), `counterOf`, `transfer` (`board-phrases.ts`), `movedCard`, `theyOf` and `cardAttribute`.
- The card's number is `cardAttribute(movedCard(env), attribute, env.game)`. A missing one is a RuleError `` `This card has no ${attribute}.` ``, and one that is not a number `` `This card's ${attribute} isn't a number.` ``
- Condition `'they have at least the card\'s {attribute} in {counter}'` (needsMove, needsPlayer): their counter is at least the card's number. It is judged while the card is still where it was.
- Effect `'they pay the card\'s {attribute}'` (needsMove, needsPayment) is `transfer(env, theyOf(env), null, number)`, so a payment below 0 notes the debt as any other.
- "Its" stays the space in a board game (R4).

- [ ] **Step 1: Write the failing tests.** In `move-phrases.test.ts`, add `describe('paying what the card says')`. `PRICED` is `COUNTER_GAME.replace('    Then:\n      They pay 1.', '    Only if they have at least the card\'s cost in coins.\n    Then:\n      They pay the card\'s cost.')`. Arrange a two-player engine whose shop holds a Ruby and an Opal (`relocate` them there on `initialState`).
- **Compiled.** `PRICED` has no diagnostics.
- **Paying.** p0 buys the Ruby: accepted, 7 → 4 coins. p0 buys the Opal: 4 → 3.
- **Refused.** With p0 at 2 coins, buying the Ruby is refused with `they have at least the card's cost in coins` and nothing changes. The Opal is accepted.
- **No such number.**
  - `they pay the card's name`, run with a move of a Ruby, throws `This card's name isn't a number.`
  - `they pay the card's cost`, run with a move of a card whose data is only `{ name: 'Ruby' }` (`fixtureCard`), throws `This card has no cost.`
- **Needs.** The condition matches `{ needsMove: true, needsPlayer: true }`, and the effect `{ needsMove: true, needsPayment: true }`.
- **Only in a move.** The condition in a button (`A player may pass.` with it as an `Only if`) reports `only makes sense in a rule about a player's move.`
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/move-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** it, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/move-phrases.ts src/engine/core/lang/library/move-phrases.test.ts
git commit -m "feat(lang): a card move that asks for and pays the number the card shows"
```

---

### Task 7: Stacks that never run out, and new cards made from them

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`CardSetSpec.kind`, `ExampleEnv.claim`)
- Modify: `src/engine/core/lang/cards.ts` (`buildCards`, `deckOf`, `NEXT_CARD_KEY`, `makeCard`)
- Create: `src/engine/core/lang/library/stack-phrases.ts` (`registerStackPhrases`, in `REGISTRARS` right after `registerSetupPhrases`)
- Modify: `src/engine/core/lang/card-facts.ts` (`tableColumns`), `src/engine/core/lang/phrases.ts` (`vocabFrom` card values), `src/engine/core/lang/compile.ts` (says cells): `set.kind === 'table'` becomes `set.kind !== 'standard'`
- Modify: `src/engine/core/lang/examples.ts` (`claimer(game)`), `src/engine/core/lang/library/example-phrases.ts` (`fill`, `played`), `src/engine/core/lang/library/index.ts`
- Test: `src/engine/core/lang/cards.test.ts`, `src/engine/core/lang/library/stack-phrases.test.ts` (new), `src/engine/core/lang/examples.test.ts`; the fake claimers in `library/example-phrases.test.ts` and `runtime.test.ts`

**Interfaces:**
- **`types.ts`:**
  - `CardSetSpec.kind` is `'standard' | 'table' | 'endless'`. An endless set has the identities of its table, `start: ''`, and puts no card on the table.
  - `ExampleEnv.claim(match, text, state): { id: string; state: GameState }`: the card's id, and the state with the card in it.
- **`cards.ts`:**
  - `buildCards` and `deckOf` skip endless sets, so a made card's id belongs to no deck.
  - `NEXT_CARD_KEY = 'lang:next-card'`.
  - `makeCard(state: GameState, game: CompiledGame, match: CardMatch, zoneId: string): { id: string; state: GameState } | null`:
    - it takes the first identity of an endless set, in set order, whose attributes have every entry of `match`;
    - with none, it gives null;
    - the id is `` `c${n}` ``, where `n` is the number under `NEXT_CARD_KEY`, else the number of identities in the sets that are not endless;
    - the state has `NEXT_CARD_KEY` at `n + 1`, and the new card (`faceKey` and `data` from the identity) put in `zoneId` by `relocate`.
- **`stack-phrases.ts`:**
  - Cards `'a stack called {name} that never runs out'` gives `{ kind: 'endless', identities: expandCardTable(table), start: '', acesHigh: false }`. Without a table it is a RuleError `Add a table of cards under this line.`
  - Effect `'a new {cardclass} goes to {zone}'` makes one card for each zone `resolveZoneIds` names, in that order (`each bench` makes one per seat). Without an endless card that matches, it is a RuleError `` `No stack that never runs out has ${describeCard(match)}.` ``
- **`examples.ts`:** `claimer(game)` claims as before. When no unclaimed card matches, it makes one with `makeCard(state, game, match, BOX_ZONE)`; when that is null, it throws `` `No card matches “${text}”.` `` as before.
- **`example-phrases.ts`:** `fill` threads the state through each claim before relocating, and so does `played`.

- [ ] **Step 1: Write the failing tests.** `STOCKED` is `COUNTER_GAME` plus these lines:
  - after the gems table: `'  A stack called coupons that never runs out:\n    | name   | cost |\n    | Coupon | 0    |'`;
  - Setup line `'  A new Coupon goes to each stash.'`;
  - in shopping, before `A player may pass.`: `'  A player may clip a coupon.\n    Then:\n      A new Coupon goes to their stash.'`.

In `cards.test.ts`:
- `buildCards` of `[gems (8), coupons (endless)]` makes 8 cards, `c0` to `c7`.
- `deckOf(sets, 'c3')` is the gems set, and `deckOf(sets, 'c8')` is null.
- `makeCard` with `{ name: 'Coupon' }` into `stash-p0` gives id `c8` and `lang:next-card` 9; a second call gives `c9`.
- `makeCard` with `{ name: 'Ruby' }` gives null.

In `library/stack-phrases.test.ts`:
- **Compiled.** `STOCKED` has no diagnostics. Its coupons set is `kind: 'endless'` with one identity, and "Coupon" is a card value.
- **Setup.** A two-player engine from `initialState(game, 1)` has 8 cards in the pile and shop, and one Coupon in each stash (`c8` in p0's, `c9` in p1's). `lang:next-card` is 10.
- **Clipping.** p0 clips: `c10` is a Coupon in p0's stash, face down.
- **Not endless.** `a new Ruby goes to their stash` throws `No stack that never runs out has a Ruby.`
- **Review Focus: undo and replay.**
  - After p0 clips (`c10`), `engine.undo()` restores the state, and clipping again makes `c10` again.
  - A fresh engine with `loadLog(engine.getLog())` equals the engine's state.

In `examples.test.ts`, compile `STOCKED` with this appended; it passes:

```text
Example: a stash of coupons
  Given p0's stash has a Coupon, a Coupon and a Ruby
  When p0 clips a coupon
  Then p0's stash has a Coupon, a Coupon, a Coupon and a Ruby
```

Update the two fake claimers to return `{ id, state }` with the state unchanged.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/cards.test.ts src/engine/core/lang/library/stack-phrases.test.ts src/engine/core/lang/examples.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the three files and `bunx vitest run src/engine/core/lang/library/example-phrases.test.ts src/engine/core/lang/runtime.test.ts src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/cards.ts src/engine/core/lang/library/stack-phrases.ts src/engine/core/lang/card-facts.ts \
  src/engine/core/lang/phrases.ts src/engine/core/lang/compile.ts src/engine/core/lang/examples.ts src/engine/core/lang/library/example-phrases.ts \
  src/engine/core/lang/library/index.ts src/engine/core/lang/cards.test.ts src/engine/core/lang/library/stack-phrases.test.ts \
  src/engine/core/lang/examples.test.ts src/engine/core/lang/library/example-phrases.test.ts src/engine/core/lang/runtime.test.ts
git commit -m "feat(lang): stacks that never run out, new cards made from them with ids from the state, and examples that claim them"
```

---

### Task 8: Rows and queues, and blank card cells

**Files:**
- Create: `src/engine/core/lang/library/queue-phrases.ts` (`registerQueuePhrases`, in `REGISTRARS` right after `registerFlowPhrases`)
- Modify: `src/engine/core/lang/refs.ts` (`SHAREDZONE`), `src/engine/core/lang/cards.ts` (`expandCardTable`), `src/engine/core/lang/library/example-phrases.ts`, `src/engine/core/lang/library/index.ts`
- Test: `src/engine/core/lang/library/queue-phrases.test.ts` (new), `src/engine/core/lang/cards.test.ts`, `src/engine/core/lang/library/example-phrases.test.ts`

**Interfaces:**
- **`refs.ts`:** `SHAREDZONE`, type `'sharedzone'`, label `'[zone]'`: "the " and a shared zone's name, resolving to the name. Added to `VOCAB_TYPES`.
- **`queue-phrases.ts`** (rows that keep their order, queues whose bottom card is the oldest):
  - Effect `'move the bottom card of {zone} to {zone}'` moves the first card in slot order. On an empty zone it is a RuleError `` `There is no card to move: ${describeZone(from)} is empty.` ``
  - Condition `'{sharedzone} has {card}'`: some card in that shared zone matches.
  - Effect `'move {card} from {zone} to {zone}'` moves the first matching card in slot order of the first zone. With none it is a RuleError `` `There is no ${describeCard(match).replace(/^(?:an?|the) /, '')} in ${describeZone(from)}.` ``
  - Effect `'deal up to {int} cards from {zone} to {zone}'` is `deal`, but takes what is there when the source is short. A negative count is the same RuleError as `deal`'s.
  - Effect `'deal 1 card from {zone} to {zone}'` is `deal` with 1.
  - Effect `'{card} goes into the bottom fifth of {zone}'` (R8):
    - the card is the first in `state.cards` order that matches and is not in `BOX_ZONE`; with none it is a RuleError `` `No card is ${describeCard(match)}.` ``;
    - `n` is the number of other cards in the zone, `window = Math.max(1, Math.ceil(n / 5))`, and `nextInt(state.rng, Math.min(window, n) + 1)` gives `slot`;
    - `insertAtSlot` puts the card there, counted from the bottom, with the rng moved on;
    - it is face up only in a public zone.
- **`cards.ts`:** `expandCardTable` leaves out a blank cell's attribute (R8), in the card's data and its face key. `copies` stays a whole number as before.
- **`example-phrases.ts`:**
  - Expect `'{zone} has {cardlist}, in that order'` holds when the zone's cards, in slot order from the bottom, are as many as the list and each matches its item. Otherwise it says `` `Expected ${describeZone(ref)} to have ${list}, in that order, but it has ${actual}.` ``, with `actual` from `describeCards` (or `it is empty`).
  - Expect `'{card} is among the bottom {int} cards of {zone}'`: the first matching card's place counted from the bottom is below the number.

- [ ] **Step 1: Write the failing tests.**

In `library/queue-phrases.test.ts`, on the compiled `COUNTER_GAME` (its pile, shop and stash) with a `pool` row added to Table:
- **The bottom card.** With the pile holding c0, c1, c2 (slot order), `move the bottom card of the pile to the shop` moves c0. On an empty pile it throws `There is no card to move: the pile is empty.`
- **A shared zone has a card.**
  - `the shop has a Ruby` is true with a Ruby in the shop and false without one.
  - `lib.match('condition', 'their stash has a Ruby', vocab)` is still ok with pattern `'their {perzone} has {card}'`, not ambiguous.
- **Moving a named card.** `move a Ruby from the shop to the pile` moves the shop's first Ruby. With none it throws `There is no Ruby in the shop.`
- **Dealing up to.** With 2 cards in the pile, `deal up to 3 cards from the pile to their stash` moves both, in pile order. With 0 cards it moves none. `deal 1 card from the pile to each stash` deals one to each seat.
- **The bottom fifth,** with a fixture of `n` other cards in the pile and the card in the shop, over rng seeds 1 to 200:
  - `n = 34`: the card's slot is always 0 to 7, and each of 0 to 7 occurs;
  - `n = 0`: slot 0;
  - `n = 3`: slots 0 to 1;
  - `n = 6`: slots 0 to 2;
  - the card is face down in the pile;
  - the same seed gives the same slot.

In `cards.test.ts`:
- A table `| name | colour | copies |` with a row `| Ruby |  | 1 |` gives `attrs` `{ name: 'Ruby' }` and the face key `textFaceKey({ name: 'Ruby' })`.
- A row with a value keeps it.

In `library/example-phrases.test.ts`:
- `the shop has an Opal and a Ruby, in that order` is true when the shop holds Opal then Ruby, and false with the message when they are the other way round.
- `a Ruby is among the bottom 2 cards of the pile` is true at slot 1 and false at slot 2.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/queue-phrases.test.ts src/engine/core/lang/cards.test.ts src/engine/core/lang/library/example-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** them and `bunx vitest run src/games`, then `bun run test` and `bun run typecheck`. If an existing test relied on a blank card cell being `''`, stop and report it.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/queue-phrases.ts src/engine/core/lang/refs.ts src/engine/core/lang/cards.ts \
  src/engine/core/lang/library/example-phrases.ts src/engine/core/lang/library/index.ts src/engine/core/lang/library/queue-phrases.test.ts \
  src/engine/core/lang/cards.test.ts src/engine/core/lang/library/example-phrases.test.ts
git commit -m "feat(lang): rows and queues: the bottom card, a shared zone that has a card, moving a named card, dealing up to, the bottom fifth, and blank cells left out"
```

---

### Task 9a: Startup Simulator: the cards, the table, setup, recruiting, Cleanup and the End

**Files:**
- Create: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`

**Interfaces:**
- Consumes every phrase of Tasks 1–8.
- **Move types:**
  - buttons `'recruit a junior software dev'`, `'recruit a junior hardware eng'`, `'recruit a junior qa tester'`, `'end their actions'`;
  - card moves `'hire'` (from the agency row and from the open job market) and `'discard'` (in both Cleanup phases).
- **Zone ids:**
  - shared: `talent-deck`, `agency-row`, `open-job-market`, `seed-deck`, `growth-deck`, `seed-market`, `growth-market`, `open-idea-pool`, `crash-pile`, `box`;
  - per player: `bench-pN`, `backlog-pN`, `research-pN`.

- [ ] **Step 1: Write `src/games/startup-simulator.rules`** exactly as below. The talent and product rows come from the rulebook as follows.
  - **Talent cards** (`| name | cost | skill | output | salary | role | trait | copies |`): §20.B.1.A's 8 rows, then §20.B.1.B's 6, in table order.
    - name: the nickname without "The" (Hacker …) or else the Role column, without "(Head of Product)".
    - cost and salary: without `$`.
    - skill: `software` for `{}`, `hardware` for `[Chk]`, `flex` for "(Flex)", blank for Specialists.
    - output: the Output number.
    - role: `Senior Developer` for §20.B.1.A, `Specialist` for §20.B.1.B.
    - trait: the bold name before the colon.
    - copies: the Count.
  - **The three stacks:** §20.B.2.A–C, cost $2, salary $0, output 1. Skills are `software`, `hardware` and `qa` (§2's Software / Hardware / QA).
  - **Seed products** (`| name | tier | blue cost | red cost | rev | val | blue maint | red maint | sector | requires | also requires | tag | copies |`): §20.C.1's 20 rows, then §20.F.1's 10.
  - **Growth products,** same columns: §20.C.2.A's 15 rows, §20.C.2.B's 5, §20.F.2's 10, §20.F.3's 4.
  - **Product columns:**
    - name: Card Name;
    - tier: `Tier 1`, `Tier 2` or `Tier 3` (R8);
    - blue and red cost from Cost / Cost (Dev): `N {}` is N and 0, `N [Chk]` is 0 and N, `A{}/B[Chk]` is A and B;
    - rev: without `$`;
    - val;
    - blue and red maint from Maint the same way (`A{}+B[Chk]` is A and B). Costs and maints are 0, never blank (C4);
    - sector: as printed;
    - requires and also requires: the first and second Tag of Requires / Dependency, blank for "None" or none;
    - tag: Tag (Provided) without brackets, blank for "--";
    - copies: 1.
    - The Color column is left out: the sector says it.
  - **The Market Crash:** §20.C.2.C, a set of its own (R8).

```text
Game: Startup Simulator
Players: 2 to 5
  Each player has 7 capital that everyone can see.
  Each player has 3 actions each turn.
  Players pay with capital.

Cards:
  A deck called talent cards, starting in the talent deck:
    | name                | cost | skill    | output | salary | role             | trait          | copies |
    | Hacker              | 6    | software | 3      | 2      | Senior Developer | Spaghetti Code | 1      |
    | Architect           | 7    | software | 3      | 2      | Senior Developer | Clean Code     | 1      |
    | Veteran             | 6    | software | 3      | 2      | Senior Developer | Mentor         | 1      |
    | Diva                | 5    | hardware | 3      | 1      | Senior Developer | Ego            | 1      |
    | Engineer            | 6    | hardware | 3      | 2      | Senior Developer | Efficient      | 1      |
    | Fixer               | 7    | hardware | 3      | 2      | Senior Developer | QA Skill       | 1      |
    | Firmware Specialist | 6    | flex     | 2      | 2      | Senior Developer | Versatile      | 2      |
    | Full Stack Ninja    | 8    | flex     | 3      | 3      | Senior Developer | Mercenary      | 2      |
    | QA Engineer         | 4    |          | 0      | 1      | Specialist       | Bug Hunter     | 3      |
    | Sales Rep           | 4    |          | 0      | 0      | Specialist       | Rainmaker      | 3      |
    | HR Manager          | 5    |          | 0      | 1      | Specialist       | Gatekeeper     | 2      |
    | Junior PM           | 5    |          | 0      | 1      | Specialist       | Synergy        | 2      |
    | Senior PM           | 8    |          | 0      | 3      | Specialist       | Agile Synergy  | 1      |
    | Growth Hacker       | 5    |          | 0      | 2      | Specialist       | Viral Loop     | 1      |
  A stack called junior software devs that never runs out:
    | name                | cost | skill    | output | salary |
    | Junior Software Dev | 2    | software | 1      | 0      |
  A stack called junior hardware engineers that never runs out:
    | name                | cost | skill    | output | salary |
    | Junior Hardware Eng | 2    | hardware | 1      | 0      |
  A stack called junior qa testers that never runs out:
    | name             | cost | skill | output | salary |
    | Junior QA Tester | 2    | qa    | 1      | 0      |
  A deck called seed products, starting in the seed deck:
    | name | tier | blue cost | red cost | rev | val | blue maint | red maint | sector | requires | also requires | tag | copies |
    | To-Do List | Tier 1 | 4 | 0 | 1 | 1 | 1 | 0 | Concept |  |  | App | 1 |
    | Flashlight App | Tier 1 | 4 | 0 | 1 | 1 | 1 | 0 | Concept |  |  | App | 1 |
    | Basic Website | Tier 1 | 4 | 0 | 1 | 1 | 1 | 0 | Concept |  |  | Platform | 1 |
    | USB Gadget | Tier 1 | 4 | 0 | 1 | 1 | 1 | 0 | Concept |  |  | Device | 1 |
    | Dating App | Tier 1 | 6 | 0 | 1 | 5 | 1 | 0 | Consumer |  |  | Social | 1 |
    | Viral Video App | Tier 1 | 6 | 0 | 2 | 3 | 1 | 0 | Consumer |  |  | Social | 1 |
    | Messaging App | Tier 1 | 4 | 0 | 1 | 2 | 1 | 0 | Consumer |  |  | Social | 1 |
    | Mobile Wallet | Tier 1 | 4 | 0 | 2 | 2 | 1 | 0 | FinTech |  |  | Commerce | 1 |
    | Payment Gateway | Tier 1 | 6 | 0 | 3 | 2 | 1 | 0 | FinTech |  |  | Commerce | 1 |
    | Trading Bot | Tier 1 | 6 | 0 | 4 | 1 | 2 | 0 | FinTech |  |  | Commerce | 1 |
    | Smart Thermostat | Tier 1 | 2 | 4 | 2 | 3 | 0 | 1 | Deep Tech |  |  | IoT | 1 |
    | Fitness Wearable | Tier 1 | 2 | 4 | 2 | 3 | 0 | 1 | Deep Tech |  |  | IoT | 1 |
    | Smart Lock | Tier 1 | 1 | 5 | 2 | 3 | 0 | 1 | Deep Tech |  |  | IoT | 1 |
    | Health Tracker | Tier 1 | 4 | 0 | 1 | 2 | 1 | 0 | Life Sci |  |  | Data | 1 |
    | Genetics Kit | Tier 1 | 0 | 8 | 3 | 4 | 0 | 1 | Life Sci |  |  | Data | 1 |
    | Telehealth Platform | Tier 1 | 6 | 0 | 2 | 3 | 1 | 0 | Life Sci |  |  | Data | 1 |
    | Tech Blog | Tier 1 | 4 | 0 | 1 | 1 | 1 | 0 | Infra |  |  | Platform | 1 |
    | Cloud Storage | Tier 1 | 4 | 4 | 3 | 2 | 0 | 1 | Infra |  |  | Platform | 1 |
    | Gig Economy | Tier 1 | 8 | 0 | 3 | 2 | 1 | 0 | Infra |  |  | Platform | 1 |
    | App Store | Tier 1 | 6 | 0 | 4 | 3 | 1 | 0 | Infra |  |  | Platform | 1 |
    | Indie Game Hit | Tier 1 | 6 | 0 | 3 | 1 | 1 | 0 | Consumer |  |  | App | 1 |
    | News Aggregator | Tier 1 | 4 | 0 | 1 | 3 | 1 | 0 | Consumer |  |  | Platform | 1 |
    | Crowdfunding Page | Tier 1 | 4 | 0 | 1 | 3 | 1 | 0 | FinTech |  |  | Platform | 1 |
    | Budgeting App | Tier 1 | 4 | 0 | 2 | 1 | 1 | 0 | FinTech |  |  | App | 1 |
    | Smart Toy | Tier 1 | 1 | 3 | 2 | 2 | 0 | 1 | Deep Tech |  |  | Device | 1 |
    | Pet Tracker | Tier 1 | 2 | 4 | 2 | 3 | 0 | 1 | Deep Tech |  |  | IoT | 1 |
    | Sleep Monitor | Tier 1 | 2 | 4 | 1 | 4 | 0 | 1 | Life Sci |  |  | Data | 1 |
    | Meditation App | Tier 1 | 4 | 0 | 1 | 2 | 1 | 0 | Life Sci |  |  | Data | 1 |
    | VPN Service | Tier 1 | 4 | 0 | 2 | 2 | 1 | 0 | Infra |  |  | Platform | 1 |
    | Dev Tools | Tier 1 | 6 | 0 | 3 | 2 | 1 | 0 | Infra |  |  | Platform | 1 |
  A deck called growth products, starting in the growth deck:
    | name | tier | blue cost | red cost | rev | val | blue maint | red maint | sector | requires | also requires | tag | copies |
    | Streaming Service | Tier 2 | 10 | 0 | 6 | 6 | 2 | 0 | Consumer | Social |  | Media | 1 |
    | Esports League | Tier 2 | 10 | 0 | 5 | 8 | 2 | 0 | Consumer | Social |  | Media | 1 |
    | Social VR Space | Tier 2 | 12 | 0 | 4 | 8 | 2 | 0 | Consumer | Social |  | Media | 1 |
    | Neobank | Tier 2 | 10 | 0 | 3 | 10 | 1 | 0 | FinTech | Commerce |  | Crypto | 1 |
    | NFT Marketplace | Tier 2 | 10 | 0 | 5 | 6 | 2 | 0 | FinTech | Platform |  | Crypto | 1 |
    | P2P Lending | Tier 2 | 12 | 0 | 6 | 5 | 2 | 0 | FinTech | Commerce |  | Crypto | 1 |
    | Drone Delivery | Tier 2 | 6 | 6 | 5 | 8 | 1 | 1 | Deep Tech | IoT |  | Robotics | 1 |
    | Smart Grid | Tier 2 | 2 | 10 | 7 | 5 | 0 | 2 | Deep Tech | IoT |  | Energy | 1 |
    | Auto Warehouse | Tier 2 | 4 | 8 | 6 | 6 | 0 | 2 | Deep Tech | IoT |  | Robotics | 1 |
    | AI Diagnostician | Tier 2 | 14 | 0 | 2 | 12 | 2 | 0 | Life Sci | Data |  | Bio | 1 |
    | Lab-Grown Meat | Tier 2 | 8 | 6 | 4 | 8 | 1 | 1 | Life Sci | Data |  | Bio | 1 |
    | Smart Prosthetics | Tier 2 | 4 | 8 | 5 | 8 | 1 | 1 | Life Sci | Data |  | Bio | 1 |
    | Server Farm | Tier 2 | 0 | 8 | 7 | 4 | 0 | 2 | Infra | Platform |  | Cloud | 1 |
    | Search Engine | Tier 2 | 12 | 0 | 6 | 8 | 2 | 0 | Infra | Platform |  | AI | 1 |
    | Cybersecurity Firm | Tier 2 | 14 | 0 | 8 | 4 | 2 | 0 | Infra | Platform |  | Cloud | 1 |
    | The Metaverse | Tier 3 | 16 | 0 | 0 | 25 | 3 | 0 | Consumer | Media | Cloud | Metaverse | 1 |
    | Global Currency | Tier 3 | 18 | 0 | 2 | 22 | 2 | 0 | FinTech | Crypto | Cloud | DeFi | 1 |
    | Fusion Reactor | Tier 3 | 4 | 20 | 10 | 20 | 0 | 3 | Deep Tech | Robotics | AI | Fusion | 1 |
    | Immortality Pill | Tier 3 | 10 | 10 | 15 | 25 | 2 | 2 | Life Sci | Bio | AI | Longevity | 1 |
    | Quantum Computer | Tier 3 | 0 | 18 | 10 | 15 | 0 | 3 | Infra | AI |  | Quantum | 1 |
    | Influencer Agency | Tier 2 | 10 | 0 | 7 | 5 | 2 | 0 | Consumer | Social |  | Media | 1 |
    | Music API | Tier 2 | 12 | 0 | 4 | 8 | 2 | 0 | Consumer | Platform |  | Media | 1 |
    | InsurTech Platform | Tier 2 | 12 | 0 | 5 | 7 | 2 | 0 | FinTech | Data |  | Crypto | 1 |
    | Algo-Trading Firm | Tier 2 | 14 | 0 | 9 | 2 | 2 | 0 | FinTech | Commerce |  | Crypto | 1 |
    | Vertical Farm | Tier 2 | 4 | 10 | 6 | 6 | 0 | 2 | Deep Tech | IoT |  | Robotics | 1 |
    | Exoskeleton Suit | Tier 2 | 6 | 8 | 5 | 8 | 1 | 1 | Deep Tech | Device |  | Robotics | 1 |
    | Genome Editor | Tier 2 | 15 | 0 | 3 | 12 | 2 | 0 | Life Sci | Data |  | Bio | 1 |
    | Bio-Fuel Cell | Tier 2 | 2 | 12 | 6 | 6 | 0 | 2 | Life Sci | IoT |  | Energy | 1 |
    | Blockchain Ledger | Tier 2 | 10 | 0 | 4 | 6 | 2 | 0 | Infra | Platform |  | Cloud | 1 |
    | Quantum Prototype | Tier 2 | 2 | 12 | 1 | 10 | 0 | 2 | Infra | Platform |  | AI | 1 |
    | Neural Social Grid | Tier 3 | 18 | 0 | 2 | 24 | 3 | 0 | Consumer | Media | Bio |  | 1 |
    | DAO Nation | Tier 3 | 20 | 0 | 0 | 28 | 2 | 0 | FinTech | Crypto | Social |  | 1 |
    | Asteroid Mining | Tier 3 | 8 | 18 | 12 | 18 | 0 | 3 | Deep Tech | Robotics | Cloud |  | 1 |
    | Planetary Wi-Fi | Tier 3 | 6 | 16 | 8 | 16 | 0 | 3 | Infra | Cloud | IoT |  | 1 |
  A deck called the market crash, starting in the growth deck:
    | name         |
    | Market Crash |

Table:
  The talent deck is a pile in the center that no one can see.
  The agency row is a row in the center that everyone can see.
  The open job market is a row in the center that everyone can see.
  The seed deck is a pile in the center that no one can see.
  The growth deck is a pile in the center that no one can see.
  The seed market is a row in the center that everyone can see.
  The growth market is a row in the center that everyone can see.
  The open idea pool is a row in the center that everyone can see.
  The crash pile is a pile in the center that everyone can see.
  The box is a pile in the center that no one can see.
  Each player has a bench row that only they can see.
  Each player has a backlog row that only they can see.
  Each player has a research row that only they can see.

Setup:
  Shuffle the talent deck.
  Shuffle the seed deck.
  Shuffle the growth deck.
  The market crash goes into the bottom fifth of the growth deck.
  The start player is chosen at random.
  A new Junior Software Dev goes to each bench.
  A new Junior Hardware Eng goes to each bench.
  A new Junior QA Tester goes to each bench.
  Deal 1 card from the seed deck to each backlog.

In every phase:
  When the agency row has fewer than 4 cards:
    Only if the talent deck is not empty.
    Move the top card of the talent deck to the agency row.
  When the seed market has fewer than 2 cards:
    Only if the seed deck is not empty.
    Move the top card of the seed deck to the seed market.
  When the growth market has fewer than 2 cards:
    Only if the growth deck is not empty.
    Move the top card of the growth deck to the growth market.
  When the growth market has the market crash:
    Move the market crash from the growth market to the crash pile.
  When the open job market has more than 5 cards:
    Move the bottom card of the open job market to the box.
  When the open idea pool has more than 5 cards:
    Move the bottom card of the open idea pool to the box.

Phase: actions
  Players take turns.
  Hint: Spend 3 actions: recruit, draft ideas or research. Drag a card from the agency row or a market to hire or draft it.
  A player may recruit a junior software dev.
    Only if they have at least 1 action.
    Only if they have at least 2 capital.
    Then:
      They pay 2.
      They spend 1 action.
      A new Junior Software Dev goes to their bench.
  A player may recruit a junior hardware eng.
    Only if they have at least 1 action.
    Only if they have at least 2 capital.
    Then:
      They pay 2.
      They spend 1 action.
      A new Junior Hardware Eng goes to their bench.
  A player may recruit a junior qa tester.
    Only if they have at least 1 action.
    Only if they have at least 2 capital.
    Then:
      They pay 2.
      They spend 1 action.
      A new Junior QA Tester goes to their bench.
  A player may hire a card from the agency row to their bench.
    Only if they have at least 1 action.
    Only if they have at least the card's cost in capital.
    Then:
      They pay the card's cost.
      They spend 1 action.
  A player may hire a card from the open job market to their bench.
    Only if they have at least 1 action.
    Only if they have at least 1 capital.
    Then:
      They pay 1.
      They spend 1 action.
  A player may end their actions.
    Then:
      Their actions go back to 0.
  When they have less than 1 action, go to bench cleanup.

Phase: bench cleanup
  Hint: Your bench holds 5 cards. Drag the rest to the open job market.
  A player may discard a card from their bench to the open job market.
    Only if their bench has more than 5 cards.
  When their bench has fewer than 6 cards, go to backlog cleanup.

Phase: backlog cleanup
  Hint: Your backlog holds 3 cards. Drag the rest to the open idea pool.
  A player may discard a card from their backlog to the open idea pool.
    Only if their backlog has more than 3 cards.
  When their backlog has fewer than 4 cards:
    The turn passes to the left.

End:
  The game ends when the crash pile is not empty and the round is finished.
  Each player scores 1 point for every 5 capital.
  Each Tier 1 card in a player's backlog scores -2 points.
  Each Tier 2 card in a player's backlog scores -5 points.
  Each Tier 3 card in a player's backlog scores -10 points.
  The highest score wins, and tied players share the win.
```

- [ ] **Step 2: Append these 10 examples** after `End:`. Givens run on a table with nothing dealt; building the engine fills the markets from their decks.
  - The first table is p0's arranged turn in round 1, and p0 is the start player unless a Given says otherwise.
  - An example that arranges a deck must also fill that deck's market (or the agency row with 4), or the refill draws from the deck it arranged.

```text
Example: setting up (ruling 25)
  Given the game is set up
  Then p0 has 7 capital
  And p1 has 7 capital
  And p0 has 3 actions
  And p0's bench has a Junior Software Dev, a Junior Hardware Eng and a Junior QA Tester
  And p1's bench has a Junior Software Dev, a Junior Hardware Eng and a Junior QA Tester
  And p0's backlog has 1 card
  And p1's backlog has 1 card
  And the agency row has 4 cards
  And the seed market has 2 cards
  And the growth market has 2 cards
  And the talent deck has 18 cards
  And the seed deck has 26 cards
  And the growth deck has 33 cards
  And the market crash is among the bottom 8 cards of the growth deck
  And the open job market is empty
  And the open idea pool is empty

Example: a turn has 3 actions
  Given p0's bench has a QA Engineer, a QA Engineer and a Sales Rep
  When p0 recruits a junior software dev
  And p0 recruits a junior hardware eng
  And p0 recruits a junior qa tester
  Then it is accepted
  And p0 has 0 actions
  And p0 has 1 capital
  And the phase is bench cleanup
  And it is p0's turn
  And p0's bench has a QA Engineer, a QA Engineer, a Sales Rep, a Junior Software Dev, a Junior Hardware Eng and a Junior QA Tester

Example: you can't pay, so you can't act (section 6)
  Given p0 has 4 capital
  And the agency row has the Hacker, the Architect, the Veteran and the Diva
  When p0 hires the Diva
  Then it is rejected because "they have at least the card's cost in capital"
  And p0 has 3 actions
  And p0 has 4 capital
  And the agency row has the Hacker, the Architect, the Veteran and the Diva
  Given p0 has 1 capital
  When p0 recruits a junior software dev
  Then it is rejected because "they have at least 2 capital"
  And p0 has 3 actions

Example: the University costs 2 and hires to the bench (ruling 20)
  When p0 recruits a junior software dev
  Then it is accepted
  And p0 has 5 capital
  And p0 has 2 actions
  And p0's bench has a Junior Software Dev

Example: the agency row slides left and refills from the talent deck, which never reshuffles (section 13)
  Given the agency row has the Hacker, the Architect, the Veteran and the Diva
  And the talent deck has a Sales Rep
  When p0 hires the Architect
  Then it is accepted
  And p0 has 0 capital
  And p0's bench has the Architect
  And the agency row has the Hacker, the Veteran, the Diva and a Sales Rep, in that order
  And the talent deck is empty
  Given p0 has 7 capital
  When p0 hires the Hacker
  Then it is accepted
  And the agency row has the Veteran, the Diva and a Sales Rep, in that order

Example: the open job market costs 1 and hires to the bench (ruling 20)
  Given the open job market has the Fixer
  When p0 hires the Fixer
  Then it is accepted
  And p0 has 6 capital
  And p0 has 2 actions
  And p0's bench has the Fixer
  And the open job market is empty

Example: the bench is cut to 5, and the open job market keeps the 5 newest (rulings 10 and 12)
  Given the phase is bench cleanup
  And p0's bench has a QA Engineer, a QA Engineer, a QA Engineer, a Sales Rep, a Sales Rep and a Sales Rep
  And the open job market has an HR Manager, a Junior PM, a Junior PM, a Growth Hacker and an HR Manager
  When p0 recruits a junior software dev
  Then it is rejected because "You can't recruit a junior software dev during bench cleanup."
  When p0 discards a Sales Rep
  Then it is accepted
  And the open job market has a Junior PM, a Junior PM, a Growth Hacker, an HR Manager and a Sales Rep, in that order
  And the box has an HR Manager
  And p0's bench has 5 cards
  And it is p1's turn

Example: the backlog is cut to 3 (ruling 10)
  Given the phase is backlog cleanup
  And p0's backlog has a To-Do List, a Smart Lock, a Dating App and a Mobile Wallet
  When p0 discards the Smart Lock
  Then it is accepted
  And the open idea pool has a Smart Lock
  And p0's backlog has a To-Do List, a Dating App and a Mobile Wallet
  And it is p1's turn

Example: ending your actions early loses the rest
  Given p0 has 2 actions
  And p1 has 1 action
  When p0 ends their actions
  Then it is accepted
  And p0 has 0 actions
  And it is p1's turn
  And the phase is actions
  And p1 has 3 actions

Example: each round starts with the start player (ruling 13)
  Given 3 players
  And p1 is the start player
  And it is p1's turn
  When p0 recruits a junior software dev
  Then it is rejected because "It's p1's turn."
  When p1 ends their actions
  Then it is p2's turn
  When p2 ends their actions
  Then it is p0's turn
  When p0 ends their actions
  Then it is p1's turn
  And p1 has 3 actions
```

How the numbers come from the rulebook:
- **Setup** (§4) at 2 players:
  - $7 each, and a starting Bench of one of each Junior;
  - one Seed card in each Backlog;
  - 4 agency cards, so 22 − 4 = 18 in the talent deck;
  - 30 − 2 Backlogs − 2 market = 26 seed cards;
  - 34 + the Crash − 2 = 33 growth cards;
  - the Crash among the bottom ⌈34 / 5⌉ + 1 = 8.
- **Prices:** the Diva costs $5 and the Architect $7 (§20.B); University $2 and the Open Job Market $1 (§13.A).
- **Eviction:** the Open Job Market's oldest card (its first HR Manager) leaves for the box when a sixth enters (§15.A.4).

- [ ] **Step 3: Write `src/games/startup-simulator.test.ts`**, in the shape of `venom.test.ts`, with `describe('Startup Simulator (designer language)')`:
  - **Compiles** with `diagnostics` `[]`.
  - **Passes every example:** 10 results, all `pass`.
  - **The cards (§20).** `initialState(game, 1)` has 87 cards:
    - **Talent deck.** 22 cards, with name counts Hacker 1, Architect 1, Veteran 1, Diva 1, Engineer 1, Fixer 1, Firmware Specialist 2, Full Stack Ninja 2, QA Engineer 3, Sales Rep 3, HR Manager 2, Junior PM 2, Senior PM 1, Growth Hacker 1.
      - The costs sum to 122 and the salaries to 33.
      - The Hacker's data is `{ name: 'Hacker', cost: 6, skill: 'software', output: 3, salary: 2, role: 'Senior Developer', trait: 'Spaghetti Code' }`.
      - A QA Engineer's data has no `skill` key.
    - **Seed deck.** 30 cards with 30 names, all `tier: 'Tier 1'`. Sums: blue cost 122, red cost 36, rev 58, val 68, blue maint 23, red maint 8.
    - **Growth deck.** 35 cards: 25 of `Tier 2`, 9 of `Tier 3`, and the Market Crash, whose data is `{ name: 'Market Crash' }`. Sums: blue cost 315, red cost 170, rev 188, val 369, blue maint 45, red maint 30.
    - **C4.** Every product card's four cost and maint values are numbers.
    - **Spot checks.**
      - The Metaverse's data has `requires: 'Media'`, `'also requires': 'Cloud'`, `tag: 'Metaverse'`.
      - DAO Nation's data has no `tag` key.
      - Smart Lock's data has no `requires` key.
    - **Stacks.** `game.cards` has three endless sets whose names are Junior Software Dev, Junior Hardware Eng and Junior QA Tester.
  - **The zones.** Bench, backlog and research are per-player rows only their owner can see. The other ten are shared, with the visibility the Table lines say.
  - **Setup at every count** (seeds 1 to 10, at 2, 3, 4 and 5 players):
    - the turn is `{ current: start player, phase: 'actions' }`, and the round is 1;
    - the Market Crash is among the 8 bottom cards of the growth deck;
    - each bench holds exactly the three Juniors;
    - each backlog holds one face-down card of `Tier 1`;
    - the agency row holds 4, and each market 2.
    - At 3 players the Juniors are `c87` to `c95` and `lang:next-card` is 96.
  - **The start player** varies: seeds 1 to 20 at 5 players give at least 3 different start players.
  - **2 to 5 players (ruling 25).** `createEngine` with 1 or 6 players throws `This game is for 2 to 5 players.`
- [ ] **Step 4: Run** `bunx vitest run src/games/startup-simulator.test.ts`.
  - Fix any failure in the phrases or the text, not in the example numbers: they come from the rulebook.
  - A failure that needs a language change beyond Tasks 1–8 is reported, not worked around.
  - Then run `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts
git commit -m "feat(games): Startup Simulator slice 1a: the cards, the table, setup, recruiting, Cleanup and the End"
```

---

### Task 9b: Startup Simulator: Ideation, Research, the Market Crash and the score; a sample in the designer

**Files:**
- Modify: `src/games/startup-simulator.rules`, `src/games/startup-simulator.test.ts`
- Modify: `src/pages/designer/samples.ts`, `src/pages/designer/designer-page.test.tsx`, `README.md`

**Interfaces:**
- New move types: card move `'draft'` (from the seed market, the growth market and the open idea pool), buttons `'research the seed deck'` and `'research the growth deck'`, card move `'keep'` (in research).
- `SAMPLES` gains `{ name: 'Startup Simulator', text: STARTUP_SIMULATOR }` after Rent Day.

- [ ] **Step 1: Add Ideation** to the actions phase, right before `  A player may end their actions.`:

```text
  A player may draft a card from the seed market to their backlog.
    Only if they have at least 1 action.
    Only if their backlog has fewer than 4 cards.
    Then:
      They spend 1 action.
  A player may draft a card from the growth market to their backlog.
    Only if they have at least 1 action.
    Only if their backlog has fewer than 4 cards.
    Then:
      They spend 1 action.
  A player may draft a card from the open idea pool to their backlog.
    Only if they have at least 2 actions.
    Only if their backlog has fewer than 4 cards.
    Then:
      They spend 2 actions.
  A player may research the seed deck.
    Only if they have at least 1 action.
    Only if their backlog has fewer than 4 cards.
    Only if the seed deck is not empty.
    Then:
      They spend 1 action.
      Deal up to 3 cards from the seed deck to their research.
      The research phase starts with them.
  A player may research the growth deck.
    Only if they have at least 1 action.
    Only if their backlog has fewer than 4 cards.
    Only if the growth deck is not empty.
    Then:
      They spend 1 action.
      Deal up to 3 cards from the growth deck to their research.
      The research phase starts with them.
```

- [ ] **Step 2: Add the research phase** right after the actions phase:

```text
Phase: research
  Hint: Keep one of the cards you drew. The rest go to the open idea pool.
  A player may keep a card from their research to their backlog.
    Then:
      Move their research to the open idea pool.
      Go back to the interrupted turn.
  When their research has the market crash:
    Move the market crash from their research to the crash pile.
    If the growth deck is not empty, move the top card of the growth deck to their research.
  When their research is empty:
    Go back to the interrupted turn.
```

- [ ] **Step 3: Append these 11 examples** after the first 10, for 21 in all:

```text
Example: each half of the product market refills from its own deck (ruling 18)
  Given the seed market has a To-Do List and a Smart Lock
  And the seed deck has a Dating App and a Mobile Wallet
  And the growth market has a Neobank and a Search Engine
  And the growth deck has a Smart Grid
  When p0 drafts the Smart Lock
  Then it is accepted
  And the seed market has a To-Do List and a Mobile Wallet
  And the seed deck has a Dating App
  When p0 drafts the Neobank
  Then it is accepted
  And the growth market has a Search Engine and a Smart Grid
  And the growth deck is empty
  And p0's backlog has a Smart Lock and a Neobank
  And p0 has 1 action

Example: research draws 3 and keeps 1 (ruling 18)
  Given the seed market has a To-Do List and a Flashlight App
  And the seed deck has a Smart Lock, a Dating App and a Mobile Wallet
  When p0 researches the seed deck
  Then it is accepted
  And the phase is research
  And it is p0's turn
  And p0 has 2 actions
  And p0's research has a Smart Lock, a Dating App and a Mobile Wallet
  When p0 keeps the Dating App
  Then it is accepted
  And p0's backlog has a Dating App
  And the open idea pool has a Smart Lock and a Mobile Wallet, in that order
  And p0's research is empty
  And the phase is actions

Example: the cards not kept enter the open idea pool in the order they were drawn (ruling 12)
  Given the seed market has a Smart Lock and a Mobile Wallet
  And the open idea pool has a To-Do List, a Flashlight App, a Basic Website and a USB Gadget
  And the seed deck has a Dating App, a Viral Video App and a Messaging App
  When p0 researches the seed deck
  And p0 keeps the Viral Video App
  Then it is accepted
  And the open idea pool has a Flashlight App, a Basic Website, a USB Gadget, a Dating App and a Messaging App, in that order
  And the box has a To-Do List

Example: the open idea pool costs 2 actions (section 14)
  Given p0 has 1 action
  And the open idea pool has a Smart Lock
  When p0 drafts the Smart Lock
  Then it is rejected because "they have at least 2 actions"
  Given p0 has 2 actions
  When p0 drafts the Smart Lock
  Then it is accepted
  And p0's backlog has a Smart Lock
  And p0 has 0 actions
  And it is p1's turn

Example: ideation stops at a fourth backlog card (section 14)
  Given p0's backlog has a To-Do List, a Smart Lock, a Dating App and a Mobile Wallet
  And the seed market has a Messaging App and a Health Tracker
  When p0 drafts the Messaging App
  Then it is rejected because "their backlog has fewer than 4 cards"
  When p0 researches the seed deck
  Then it is rejected because "their backlog has fewer than 4 cards"
  And p0 has 3 actions

Example: the market crash in a refill is set aside, and the round is finished first (section 12)
  Given p0 is the start player
  And the growth market has a Neobank and a Search Engine
  And the growth deck has a Smart Grid and the Market Crash
  When p0 drafts the Neobank
  Then it is accepted
  And the crash pile has the Market Crash
  And the growth market has a Search Engine and a Smart Grid
  And the game is not over
  When p0 ends their actions
  Then it is p1's turn
  And the game is not over
  When p1 ends their actions
  Then the game is over

Example: the market crash in research is set aside and replaced (section 12)
  Given the growth market has a Streaming Service and an Esports League
  And the growth deck has a Smart Grid, a Neobank, the Market Crash and a Search Engine
  When p0 researches the growth deck
  Then it is accepted
  And the crash pile has the Market Crash
  And p0's research has a Neobank, a Search Engine and a Smart Grid
  And the growth deck is empty
  When p0 keeps the Search Engine
  Then the open idea pool has a Neobank and a Smart Grid, in that order

Example: research that finds only the market crash keeps nothing, and the turn goes on
  Given the growth market has a Streaming Service and an Esports League
  And the growth deck has the Market Crash
  When p0 researches the growth deck
  Then it is accepted
  And the crash pile has the Market Crash
  And the phase is actions
  And p0 has 2 actions
  And p0's research is empty
  And p0's backlog is empty

Example: the game ends only once the round is finished (rulings 13 and 25)
  Given 3 players
  And the crash pile has the Market Crash
  And it is p1's turn
  When p1 ends their actions
  Then it is p2's turn
  And the game is not over
  When p2 ends their actions
  Then the game is over

Example: 1 point for every 5 capital, vaporware, and tied players share the win (ruling 24)
  Given 3 players
  And the crash pile has the Market Crash
  And p0 has 39 capital
  And p1 has 50 capital
  And p2 has 75 capital
  And p0's backlog has a Smart Lock
  And p1's backlog has a Neobank
  And p2's backlog has a Global Currency
  And it is p2's turn
  When p2 ends their actions
  Then the game is over
  And p0 scores 5
  And p1 scores 5
  And p2 scores 5
  And p0, p1 and p2 win

Example: the highest score wins
  Given the crash pile has the Market Crash
  And p0 has 10 capital
  And p1 has 9 capital
  And it is p1's turn
  When p1 ends their actions
  Then the game is over
  And p0 scores 2
  And p1 scores 1
  And p0 wins
```

How the numbers come:
- **Pile order.** A deck a Given fills runs bottom to top in the order listed, so the last card named is drawn first. Research deals the top 3 in deck order.
- **The Crash.** In a refill the Crash comes off the top and the next card replaces it. In research the next growth card takes the Crash's place, at the end of the row.
- **Scores** (§12):
  - 39 / 5 rounds down to 7, and a Tier 1 card costs 2: 5;
  - 50 / 5 is 10, and a Tier 2 card costs 5: 5;
  - 75 / 5 is 15, and a Tier 3 card costs 10: 5;
  - 10 / 5 is 2, and 9 / 5 rounds down to 1.

- [ ] **Step 4: Extend `startup-simulator.test.ts`.**
  - **Examples:** 21 results, all `pass`.
  - **Engine tests.** Each arranges a two-player state with `relocate` on `initialState(game, 1)` plus the turn `{ current: 'p0', phase: 'actions' }`, as examples do, with `markTurnStarted` from `turns.ts`.
    - **Review Focus: short decks.**
      - With 2 cards in the seed deck and 2 in the seed market, researching the seed deck puts 2 cards in p0's research. Keeping one sends the other to the pool.
      - With an empty talent deck and 4 agency cards, hiring one leaves 3, with no error.
    - **Review Focus: the Crash as the last growth card.** The growth market holds 2 cards and the growth deck only the Crash. Drafting a growth card sets the Crash aside: the growth market holds 1 card and the deck is empty. The game is over once p1 ends their actions after p0's turn.
    - **Review Focus: hidden zones.** After p0 researches the seed deck (`tableDefFor(game, seats)`):
      - `deriveScene(tableDef, { cards }, 'p1')` shows every card of `research-p0`, `bench-p0` and `backlog-p0` with face key `HIDDEN_FACE_KEY`;
      - `deriveScene(…, 'p0')` shows their real faces.
- [ ] **Step 5: The sample and the page test.**
  - In `samples.ts`, import `@/games/startup-simulator.rules?raw` and add the sample after Rent Day.
  - In `designer-page.test.tsx`, add `it('loads Startup Simulator with no problems, all 21 examples passing, 2 to 5 players and Play on')`, as Rent Day's:
    - `No problems found.` and `21 of 21 examples pass`;
    - Players `['2', '3', '4', '5']`;
    - choosing 3 and pressing Play shows `playtest 3`.
- [ ] **Step 6: Update the README.**
  - Add Startup Simulator to the **Load sample** list and to the `games/` line of the layout.
  - After the **Trading.** paragraph, add a **Card games with turns** paragraph:
    - **Counters without a board:** lines indented under `Players:` ("Each player has 7 capital that everyone can see.", "Players pay with capital."). Facts and game numbers work there too.
    - **A budget each turn:** "Each player has 3 actions each turn.", "They spend 1 action.", "Their actions go back to 0.", and counters named in the singular.
    - **Turns as steps:**
      - "they" is the player whose turn it is in a phase where players take turns, so `When they have less than 1 action, go to bench cleanup.` reads;
      - "The turn passes to the left." ends a turn with no press, and runs no start lines;
      - "The start player is chosen at random.";
      - every turn starts by itself (counters reset, "When a player's turn starts:"), and each round with the start player ("When a round starts:");
      - "When this phase starts:" under the first phase is flagged.
    - **`In every phase:`** holds rules that fire whatever the phase.
    - **The End:**
      - "The game ends when … and the round is finished.";
      - "Each player scores 1 point for every 5 capital.";
      - "The highest score wins, and tied players share the win.", with examples saying "Then p0 and p1 win".
    - **Cards:**
      - "they have at least the card's cost in capital" and "They pay the card's cost." in a card move;
      - "A stack called … that never runs out:" and "A new Junior Software Dev goes to their bench.";
      - blank cells are left out;
      - "move the bottom card of …", "the growth market has the market crash", "move the market crash from … to …", "deal up to 3 cards …", "deal 1 card …", "… goes into the bottom fifth of …";
      - examples "…, in that order" and "… is among the bottom 8 cards of …".
    - **Startup Simulator (slice 1a)** plays the table, money and turns: recruiting, drafting, Research, Cleanup, the Market Crash and a first score. Its 21 examples pin rulings 10, 12, 13, 18, 20, 24 and 25.
      - Building products comes in slice 1b.
      - The game still leaves out the game-end Ops check (§12.2) and the last Milestone check (§12.3).
      - Growth cards are drafted but can't be built until slice 3.
- [ ] **Step 7: Run** `bunx vitest run src/games/startup-simulator.test.ts src/pages/designer`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 8: Commit**

```bash
git add src/games/startup-simulator.rules src/games/startup-simulator.test.ts src/pages/designer/samples.ts \
  src/pages/designer/designer-page.test.tsx README.md
git commit -m "feat(games): Startup Simulator slice 1a: Ideation, Research, the Market Crash and the score, and the game as a designer sample"
```

---

### Task 10: Long runs at 2 to 5 players, with every invariant after every move

**Files:**
- Modify: `src/games/startup-simulator.test.ts`

**Interfaces:**
- Consumes the move types of Tasks 9a and 9b, `markTurnStarted`, `startPlayerOf`, `TURN_OF_KEY`, `ROUND_KEY`, `deriveScene`, `HIDDEN_FACE_KEY`, `tableDefFor`, `zoneIdFor` and `counterOf`.
- **`playGame(players, seed, watch)`** plays one game from `createEngine(game, lib, players, initialState(game, seed))` until a result or 300 turns, and gives the engine.
  - Every move goes through `play(engine, move, watch)`, which expects `dispatch(move).ok` and calls `watch(before, move, after)`.
  - `t` counts the turns played so far, and `a` the actions taken in this turn.
- **The auto-player (`playTurn`)** takes the current seat `by`'s turn:
  - **In actions, the first action** (`a === 0`) is an Ideation, by `t % 4`:
    - 0 or 2: research the growth deck;
    - 1: draft the first card of the growth market;
    - 3: one of research the seed deck, draft the first card of the seed market, draft the first card of the open idea pool, by `Math.floor(t / 4) % 3`.
    - When that is refused (`canDispatch !== true`), it tries research the growth deck, drafting the growth market's first card, research the seed deck and drafting the seed market's first card, in that order. With none allowed it moves on to recruiting.
  - **Each later action** is a recruit by `(t + a) % 4`:
    - 0: recruit the Junior kind `(t + a) % 3`;
    - 1: hire the first agency card it can pay for;
    - 2: hire the first open job market card;
    - 3: end their actions.
    - When that is refused or there is none, it recruits the Junior kind `(t + a) % 3`, else ends their actions.
  - **In research:** keep the research row's card at `t % length`.
  - **In bench cleanup and backlog cleanup:** discard the first card, in slot order, of the bench or backlog.
  - The turn is over once the current seat changes or the game has a result.
- **`keepsTheRules(seats)`** gives a `watch` that checks, after every move:
  - **Money is conserved** (paid to the bank only):
    - only `by`'s capital changes;
    - it falls by 2 for a recruit, by the card's cost for a hire from the agency row (read before), by 1 for a hire from the open job market, and by 0 otherwise.
  - **No zone over its capacity:**
    - agency row ≤ 4, each market ≤ 2, each pool ≤ 5, crash pile ≤ 1;
    - for every seat but the current one, bench ≤ 5, backlog ≤ 3 and research empty;
    - for the current seat, backlog ≤ 4, and research ≤ 3 and not empty only in the research phase.
  - **Markets refill at once:**
    - the agency row holds 4 unless the talent deck is empty;
    - each market holds 2 unless its deck is empty;
    - the Market Crash is in the growth deck or the crash pile.
  - **The pools hold the 5 newest.** For each pool, keep the ids in the order they entered (new ids appended in the pool's slot order). The pool in slot order equals the last 5 entered. Every id evicted is in the box.
  - **Turns.** When `TURN_OF_KEY` changes:
    - the new seat is the one after the previous in seat order;
    - the first turn is the start player's;
    - `ROUND_KEY` went up by 1 exactly when the new seat is the start player.
  - **Hidden zones.** For every viewer, every card in another seat's bench, backlog or research projects to `HIDDEN_FACE_KEY`, and their own do not.

- [ ] **Step 1: Write the tests** in `startup-simulator.test.ts`, with the helpers above:
  - **Every count ends.** `it.each([2, 3, 4, 5])`, seeds 1 to 5 each, timeout 60000. Each game ends within 300 turns, and keeps the rules after every move. At the end:
    - the crash pile holds the Market Crash;
    - the number of turns is a multiple of the player count, and the last turn's seat is the one before the start player;
    - each score is ⌊capital / 5⌋ − 2 × Tier 1 − 5 × Tier 2 − 10 × Tier 3 backlog cards;
    - `winners` is every seat with the top score, in seat order, and `winner` is the first of them.
  - **Every button and move is used.** A tally shared by the `describe` counts each move made in those runs, keyed:
    - by move type for the buttons, `keep` and `end their actions`;
    - by type and source zone for `hire`, `draft` and `discard`.
    - A last `it` expects every key above 0:
      - the three recruits, hire from the agency row and from the open job market;
      - draft from the seed market, the growth market and the open idea pool;
      - research the seed deck and the growth deck;
      - keep, end their actions, and discard from the bench and from the backlog.
    - If one stays at 0, print the tallies and find out why before changing anything. Change the auto-player, never the rules.
  - **Review Focus: undo and replay.**
    - At 3 players, seed 1, play 40 moves, keeping each state.
    - A fresh engine with `loadLog` equals the state.
    - Undoing every move gives back each kept state in turn, and finally the fresh engine's state.
    - The log holds a recruit and a research.
- [ ] **Step 2: Run** `bunx vitest run src/games/startup-simulator.test.ts`. Fix failures in the auto-player or, when an invariant shows a wrong rule, in the phrases. Report a rule the text can't express rather than relaxing an invariant.
- [ ] **Step 3: Run** `bun run test` and `bun run typecheck`.
- [ ] **Step 4: Run the word check.** It must print nothing.

```bash
git diff "$BASE" -- src/engine src/pages ':!*.test.ts' ':!*.test.tsx' ':!src/pages/designer/samples.ts' | grep '^+' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool)\b|\bseed (decks?|markets?|cards?|products?)\b'
```

- [ ] **Step 5: Check the protected files.** `git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo` prints nothing.
- [ ] **Step 6: Commit**

```bash
git add src/games/startup-simulator.test.ts
git commit -m "feat(games): Startup Simulator plays to the Market Crash and a score at 2 to 5 players, keeping money, capacities, queues, turns and hidden hands"
```
