# Board Games Slice 4 (Chance and Treasury Cards) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rent Day gains its Chance and Treasury piles, written entirely in its own text: landing on those spaces draws a card that moves, pays or charges, and "Get Out Of Jail Free" is kept until used. To get there, the language gains cards whose `says` column holds rules, a phrase that draws a card and does what it says, keeping and returning a card, moves that pass Go, and money between all players.

**Architecture:**
- **Language layer only.** New work is in the language (`src/engine/core/lang/`), the views, the designer page and Rent Day's text. Core `game-state.ts`, `flow.ts` and `game-engine.ts` stay untouched. Nothing about Chance, Treasury or Get Out Of Jail Free exists outside `src/games/rent-day.rules` and tests.
- **A card's rules are compiled once.** `CompiledGame.says` maps a `says` cell's text to one effect ref per sentence. A card carries that text in its data, so it finds its refs without the compiler storing card ids.
- **A card's deck is derived, never stored.** `buildCards` shuffles each set on its own and hands each set the next run of ids, so `deckOf(sets, cardId)` reads the deck from the id. A game with one set gets exactly the cards and rng it always got, so no existing game's card data changes.
- **Running a card.** The runtime gives phrases `env.runLine`. The draw phrase runs the card's refs through it, one sentence at a time, about `{ player, space: their space now, card }`.
- **Where the new state lives.** Cards stay in zones, as they always have: a kept card is a card in a per-player zone. The last card drawn is a new `lang:last-drawn` key.
- **New phrases.**
  - Drawing, keeping, holding and returning a card go in a new file, `library/draw-phrases.ts`.
  - Moves and payments between players go in `library/board-phrases.ts`, and paying for each building goes in `library/fact-phrases.ts`, next to `factForBank`.
- **One move between tasks.** Builder-check ruling 5 (no card table for a board game whose phases move no cards) is in Task 6, not Task 7. Task 6 gives Rent Day zones, so without the rule in the same commit the playtest would draw a card table and the existing "no card table" test would fail.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, Playwright (installed globally) for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-15-board-slice-4-chance-and-treasury-design.md`, including its *Builder-check rulings*. It is part of `docs/superpowers/specs/2026-10-15-board-games-overview-design.md`.

## Global Constraints

- **Branch and commands.** Work on `claude/peaceful-curie-rdfkow`. Single test file: `bunx vitest run <path>`. Full suite: `bun run test` (1731 tests pass at the start). Types: `bun run typecheck`.
- **No new dependencies.**
- **Pure core.** `src/engine/core/**` stays pure: no pixi, react or DOM imports, no `Math.random` or `Date.now`.
- **Files not to touch:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, and `src/pages/hearts-demo/**`.
- **Json shapes.** Everything in `CompiledGame` and every `lang:*` value is `Json`. Declare these shapes with `type` aliases, and use `null` (never `undefined`) inside them.
- **No Monopoly words in shared code.**
  - Banned words: rent, house, hotel, street, station, utility, money and jail. They must not appear in engine or language code outside `src/engine/core/lang/library/rent-day.ts`, not even in comments.
  - "chance", "treasury" and "get out of jail free" must not appear in engine, language or page code at all. They belong only in `src/games/rent-day.rules` and tests.
  - All of these may appear in tests, test fixtures (`lang/testing.ts`) and `src/games/*.rules`.
  - "says", "draw", "keep" and "nearest" are general words and may appear anywhere.
  - No non-test file under `src/pages/designer/` may contain "jail": the page shows player facts and kept cards by a general rule.
- **No engine words in front of designers.** Diagnostics, rejection reasons, example results and the page never show engine vocabulary (`FlowDef`, `NamedRef`, `zoneId`, `lang:`) or stack traces.
- **Existing behaviour stays.**
  - Hearts, Color Match and Venom compile with no diagnostics and pass their examples.
  - A game with one card set gets exactly the cards and rng it got before (Task 2 pins this).
  - Rent Day's 45 examples keep passing. In Task 6, "you cannot buy a space that has no price" gains one Given line.
  - The playtest tests' seeds change in Task 6, because building the cards and Setup's shuffles now draw on the rng.
- **Style and commits.**
  - 2-space indent, single quotes, chainable registrars, and comments that say why.
  - Commit prefixes: `feat(lang):`, `feat(games):`, `feat(designer):`, `docs:`.
  - Stage files by path, never `git add -A`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.

## Review Focus

- **A card that moves its player onto another space of the same pile draws the next card, never itself again.** The card being read must already be at the bottom, so the second draw takes the card under it, not the same card in a loop. Test in Task 2.
- **A `says` sentence the library doesn't know never holds back the rest of the rules.** Every other line is still checked, and no "can't be checked until line …" warning appears. Today's hold-back would treat that row as a broken `Cards:` line. Test in Task 1.
- **Paying or collecting from each other player skips players who are out.** Collecting may take a player below 0, and then the game's own less-than-0 rule puts them out. Test in Task 4.
- **Paying for each building counts only the drawer's own spaces.** Another player's houses are never charged, and a street with a hotel counts once, as a hotel. Test in Task 4.
- **Seat views list cards only from zones everyone can see.** A hand only its owner can see never reaches any seat's view, not even its owner's, and neither does any card in a pile. Test in Task 5.

---

### Task 1: The `says` column

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`CompiledGame.says`)
- Modify: `src/engine/core/lang/cards.ts` (`SAYS`)
- Modify: `src/engine/core/lang/card-facts.ts` (`saysOf`, `cardName`)
- Modify: `src/engine/core/lang/compile.ts` (`compileCards`, new `compileSays`, `compile`)
- Modify: `src/engine/core/lang/library/example-phrases.ts` (`describeCards`)
- Modify: `src/engine/core/lang/refs.ts` (one comment)
- Modify: `src/engine/core/lang/testing.ts` (`fixtureGame` gains `says: {}`; new `deckGameText`), and `src/engine/core/lang/zones.test.ts` (its `CompiledGame` literal gains `says: {}`)
- Test: `src/engine/core/lang/compile.test.ts`, `src/engine/core/lang/card-facts.test.ts`, `src/engine/core/lang/examples.test.ts`

**Interfaces:**
- **`types.ts`:** `CompiledGame.says: { [cell: string]: PhraseRef[] }`.
  - It holds what each `says` cell tells its cards to do, keyed by the cell's text as the cards' data holds it (trimmed).
  - There is one effect ref per sentence, in order.
  - It is `{}` for a game whose decks have no `says` column.
- **`cards.ts`:** `export const SAYS = 'says'`. A table column is the says column when `name.trim().toLowerCase() === SAYS`, so any capitals count. It is the only column name the language gives meaning to.
- **`card-facts.ts`:**
  - `saysOf(card: CardState): string | null` gives the card's says value as text (`String(value)`), or null for a card with no such column.
  - `cardName(card: CardState, game: CompiledGame): string` is the card as the page names it. It takes the values of the game's table columns (`tableColumns`) that the card has, minus the says column, in table order, joined by spaces: `'Dividend'`, `'red 7'`. A standard deck's card, which has no table, is named by its face key.
- **`compile.ts`:**
  - `compileCards` returns `{ sets: CardSetSpec[]; says: SaysCell[] }`, where `type SaysCell = { text: string; line: number }`. For every set that compiled from a table with a says column, there is one cell per row: the cell trimmed, and the row's line.
  - `compileSays(cells: SaysCell[], ctx: LineCtx): { says: CompiledGame['says']; diagnostics: Diagnostic[] }`:
    - It runs after `ctx` (the full vocabulary) is built.
    - Every row is read, so a problem is reported on each row that has it. Rows with the same text share one entry, and the first one's refs stand.
    - A cell is split into sentences at a full stop followed by whitespace. Blank pieces are dropped.
    - Each sentence is read with `matchEffectLine(sentence, row.line, { ...ctx, player: true, space: true, diagnostics: own })`. `card` stays false: in a card's sentences "it" is the space, and only "this card" names the card (Task 2).
    - An empty cell is reported on its row as `Say what this card does, like “They get 50 money.”`.
  - **Review Focus.** The says diagnostics never make a stage fail.
    - `onlyUnknownPhrases` is decided over `[...diagnostics, ...saysDiagnostics]`.
    - `holdBack` runs on `diagnostics` alone, and the says diagnostics are pushed after it. They are never held back.
  - The game returns `says`.
- **`example-phrases.ts` `describeCards`** leaves the says column out, so a failing expectation names cards by name: `…but it has a Dividend.`
- **`refs.ts`:** the comment above `resolveSpace`'s shared-name check becomes `// A rule about a name several spaces share would silently be about only one of them.` It must not name a space.
- **`testing.ts` `deckGameText`.** Write it as below. Task 2 adds two rules to it, and Tasks 2 to 5 use it.

```ts
/**
 * A board game whose two decks say what their cards do. `lucky` and `fate` are the tables under each deck line, header row
 * first; `rules` are lines under `Phase: playing`, indented as written there. Lines: the lucky table starts on line 6 (its
 * first card on line 7); the fate deck line is line 6 + lucky.length and its first card line 8 + lucky.length. The loop is
 * Go 0, Mill Lane 1, Lucky 2, North Station 3, Rose Lane 4, Lucky 5, Fate 6, Power Works 7.
 */
export function deckGameText(lucky: string[], fate: string[], rules: string[] = []): string {
  return [
    'Game: Deck Board', 'Players: 2 to 4', '', 'Cards:',
    '  A deck called lucky cards, starting in the lucky pile:', ...lucky.map((row) => `    ${row}`),
    '  A deck called fate cards, starting in the fate pile:', ...fate.map((row) => `    ${row}`),
    '', 'Table:',
    '  The lucky pile is a pile in the center that no one can see.',
    '  The fate pile is a pile in the center that no one can see.',
    '  Each player has a kept cards row that everyone can see.',
    '', 'Board:',
    '  The board is a loop of spaces, starting at Go:',
    '    | space         | kind    | color  | price | rent |',
    '    | Go            | go      |        |       |      |',
    '    | Mill Lane     | street  | brown  | 60    | 2    |',
    '    | Lucky         | lucky   |        |       |      |',
    '    | North Station | station |        | 200   | 25   |',
    '    | Rose Lane     | street  | orange | 180   | 14   |',
    '    | Lucky         | lucky   |        |       |      |',
    '    | Fate          | fate    |        |       |      |',
    '    | Power Works   | utility |        | 150   | 10   |',
    '  Each player has a piece that starts on Go.',
    '  Each player has 1500 money that everyone can see.',
    '  Players pay with money.',
    '  There are two six-sided dice.',
    '  Spaces can have houses and a hotel.',
    '  The bank has 32 houses and 12 hotels.',
    '', 'Phase: playing', '  Players take turns.',
    '  A player may roll the dice.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.',
    '      Their piece moves forward by the roll.',
    '  A player may end their turn.', '    Only if they have rolled this turn.',
    '  When a piece passes Go:', '    Its player gets 200 money.',
    '  When a player lands on a space someone else owns:', '    They pay its rent to its owner.',
    '  When a player has less than 0 money:', '    They are out.', '    Their spaces go back to the bank.',
    ...rules,
    '  After a player ends their turn, the turn passes to the left.',
    '', 'End:', '  The game ends when one player is left.', '  That player wins.',
  ].join('\n');
}
```

- [ ] **Step 1: Write the failing tests.**

In `compile.test.ts`, add `describe('cards that say what they do', …)` with `const FATE = ['| name | says |', '| Calm | They get 0 money. |']`:

```ts
it('reads each says cell, sentence by sentence, as lines about the player who drew the card', () => {
  const lucky = ['| name | says |', '| Dividend | They get 50 money. |', '| Toll | They pay 15. If someone else owns it, they pay its rent to its owner. |'];
  const { game, diagnostics } = compileGame(deckGameText(lucky, FATE), lib);
  expect(diagnostics).toEqual([]);
  expect(Object.keys(game!.says)).toEqual(['They get 50 money.', 'They pay 15. If someone else owns it, they pay its rent to its owner.', 'They get 0 money.']);
  expect(game!.says['They get 50 money.']).toEqual([{ kind: 'effect', phrase: 'they get {int} {counter}', args: [50, 'money'], line: 7, text: 'They get 50 money' }]);
  expect(game!.says['They pay 15. If someone else owns it, they pay its rent to its owner.'].map((ref) => [ref.kind, ref.phrase, ref.line]))
    .toEqual([['effect', 'they pay {int}', 8], ['lang', 'if', 8]]);
  expect(JSON.parse(JSON.stringify(game!.says))).toEqual(game!.says);
});
it("reports a sentence the library doesn't know on its row, with a stub, and still reads the others", () => {
  const { game, diagnostics } = compileGame(deckGameText(['| name | says |', '| Jig | They dance a jig. They get 5 money. |'], FATE), lib);
  expect(diagnostics.map((d) => [d.line, d.kind, d.message])).toEqual([[7, 'unknown-phrase', "“They dance a jig” isn't in the phrase library yet."]]);
  expect(diagnostics[0].stub).toBeDefined();
  expect(game!.says['They dance a jig. They get 5 money.'].map((ref) => ref.phrase)).toEqual(['missing', 'they get {int} {counter}']);
});
it("Review Focus: never holds back the rest of the rules for a says sentence the library doesn't know", () => {
  const text = deckGameText(['| name | says |', '| Jig | They dance a jig. |'], FATE, ['  When a player has less than 1 money:', '    They sing.']);
  const sing = text.split('\n').indexOf('    They sing.') + 1;
  expect(compileGame(text, lib).diagnostics.map((d) => [d.line, d.severity, d.kind])).toEqual([[7, 'error', 'unknown-phrase'], [sing, 'error', 'unknown-phrase']]);
});
```

Also add these to the same describe:
- **Shared text.** Lucky `['| name | says |', '| Jig | They dance a jig. |']` and fate the same:
  - unknown-phrase diagnostics on lines 7 and 10;
  - `Object.keys(game!.says)` equals `['They dance a jig.']`.
- **An empty cell.** `['| name | says |', '| Blank | |']` gives exactly `[[7, 'Say what this card does, like “They get 50 money.”']]`.
- **Any capitals.** A `| name | Says |` header reads the same as `says`.
- **No says column.** `compileGame(COLOR_MATCH_TEXT, lib).game!.says` equals `{}`.

In `card-facts.test.ts` and `examples.test.ts`, `FATE` is the same `['| name | says |', '| Calm | They get 0 money. |']`.

In `card-facts.test.ts`:
- **A deck card.** On `compileGame(deckGameText(['| name | Says |', '| Dividend | They get 50 money. |'], FATE), lib).game!`, the card from `buildCards(game.cards, makeRng(1))` whose `data.name` is `'Dividend'` has:
  - `saysOf` of `'They get 50 money.'`;
  - `cardName` of `'Dividend'`.
- **A Color Match card.** `fixtureCard('c0', 'deck', { color: 'red', number: 7 })` has `saysOf` null and `cardName(…, fixtureColorGame())` of `'red 7'`.

In `examples.test.ts`:
- Add the example below to the end of `deckGameText(['| name | says |', '| Dividend | They get 50 money. |', '| Fine | They pay 15. |'], FATE)`.
- Its one result has the message `Expected the lucky pile to have a Fine, but it has a Dividend.`

```text
Example: the pile
  Given the lucky pile has a Dividend
  Then the lucky pile has a Fine
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile.test.ts src/engine/core/lang/card-facts.test.ts src/engine/core/lang/examples.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Grep for other `CompiledGame` literals (`columns: {}`) and give each `says: {}`.
- [ ] **Step 4: Run** the three files, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/cards.ts src/engine/core/lang/card-facts.ts src/engine/core/lang/compile.ts \
  src/engine/core/lang/library/example-phrases.ts src/engine/core/lang/refs.ts src/engine/core/lang/testing.ts src/engine/core/lang/zones.test.ts \
  src/engine/core/lang/compile.test.ts src/engine/core/lang/card-facts.test.ts src/engine/core/lang/examples.test.ts
git commit -m "feat(lang): a deck's says column holds rules, each sentence a line about the player who draws the card"
```

---

### Task 2: Drawing a card and doing what it says, and keeping it

**Files:**
- Modify: `src/engine/core/lang/cards.ts` (`buildCards`, new `deckOf`)
- Modify: `src/engine/core/lang/zones.ts` (new `toBottom`)
- Modify: `src/engine/core/lang/board-state.ts` (`LAST_DRAWN_KEY`, `LastDrawn`, `lastDrawn`, `setLastDrawn`; its header comment says the last draw is kept for card games too)
- Modify: `src/engine/core/lang/types.ts` (`PhraseEnv.runLine`)
- Modify: `src/engine/core/lang/runtime.ts` (`runLine`)
- Modify: `src/engine/core/lang/phrases.ts` (`PhraseOpts.needsDrawnCard`, `get()`)
- Modify: `src/engine/core/lang/compile-util.ts` (`LineCtx.drawn`, `unmetNeed`)
- Modify: `src/engine/core/lang/compile.ts` (`stage` sets `drawn: false`; `compileSays` adds `drawn: true`)
- Create: `src/engine/core/lang/library/draw-phrases.ts` (`registerDrawPhrases`)
- Modify: `src/engine/core/lang/library/index.ts` (add it to `REGISTRARS` right after `registerPlayerFactPhrases`)
- Modify: `src/engine/core/lang/testing.ts` (`fixtureEnv` takes `runLine`; `deckGameText` gains the draw rules)
- Modify: `src/engine/core/lang/compile-phase.test.ts`, `src/engine/core/lang/compile-util.test.ts` (their `LineCtx` literals gain `drawn: false`)
- Test: `src/engine/core/lang/cards.test.ts`, `src/engine/core/lang/zones.test.ts`, `src/engine/core/lang/board-state.test.ts`, create `src/engine/core/lang/library/draw-phrases.test.ts`

**Interfaces:**
- Consumes `CompiledGame.says`, `saysOf` and `cardName` (Task 1).
- **`cards.ts`:**
  - `buildCards(sets, rng)` shuffles each set on its own, in the order listed, threading the rng.
    - Each set's cards get the next run of ids: with sets of 16 and 16, `c0`–`c15` and `c16`–`c31`.
    - A card's id then says which set it came from, never which card of the set it is.
    - With one set this is exactly the shuffle it always was.
  - `deckOf(sets: CardSetSpec[], cardId: string): CardSetSpec | null` gives the set whose run holds the id's number. It is null for an id `buildCards` never handed out. A card's home pile is `zoneIdFor(deckOf(…)!.start)`.
- **`zones.ts`:** `toBottom(state: GameState, cardId: string, zoneId: string, game: CompiledGame): GameState`.
  - It puts the card under every other card of the zone, and rewrites the zone's slots to 0…n-1 with it first.
  - Like `relocate`, the card is face up only in a public zone.
- **`board-state.ts`:**
  - `LAST_DRAWN_KEY = 'lang:last-drawn'`.
  - `export type LastDrawn = { seat: PlayerId; zone: string; name: string; says: string }`.
  - `lastDrawn(state: GameState): LastDrawn | null`.
  - `setLastDrawn(state: GameState, drawn: LastDrawn): GameState`.
- **`types.ts`:** `PhraseEnv.runLine?: (state: GameState, ref: PhraseRef, subject: Subject) => GameState` runs one compiled line about a subject, as a rule's line runs. The runtime supplies it.
- **`runtime.ts`:**
  - `readonly runLine` is `this.run(ref, state, undefined, undefined, subject)`, and `env()` passes it.
  - It counts how deep card lines run inside one another (decrement in `finally`). Past `MAX_MOMENT_DEPTH` it throws RuleError `Cards keep drawing cards without stopping.`
- **`phrases.ts` / `compile-util.ts`:**
  - `PhraseOpts.needsDrawnCard?: boolean`, also returned by `get()`.
  - `LineCtx.drawn: boolean`: true only for a card's `says` sentences.
  - In `unmetNeed`, right after the `needsCard` check, `!ctx.drawn && needsDrawnCard` gives `` `“${clean}” only makes sense in a card's says column.` ``
- **`draw-phrases.ts`:**
  - Effect `'they draw from {zone} and do what it says'` (needsPlayer). It runs these steps in order:
    1. `pile = soleZone(ref, env)`. With no `topCard`, it throws RuleError `` `There is no card to draw in ${describeZone(ref)}.` `` ("There is no card to draw in the chance pile.").
    2. The card's lines are `env.game.says[saysOf(card)]` (look them up with `Object.hasOwn`). A card with none throws RuleError `` `The card drawn from ${describeZone(ref)} says nothing to do: its deck has no says column.` `` A card never silently does nothing.
    3. `setLastDrawn` with:
       - `seat`: the drawer;
       - `zone`: the pile as said with its owner, `the lucky pile` for a shared zone or `p1's deck` for a seat's (`zoneInfo`);
       - `name`: `cardName`;
       - `says`: the cell text.
    4. `toBottom` the card in the same pile, then turn it face up. It is at the bottom while it is read, so a draw inside its lines takes the next card.
    5. For each ref: `s = env.runLine(s, ref, { player, space: pieceAt(s, player), card: card.id })`. The space is read again before each sentence.
    6. If the card is still in the pile, turn it face down. A card a sentence kept has left the pile and stays as that zone has it.
  - Effect `'they keep this card in their {perzone}'` (needsPlayer, needsDrawnCard) does `relocate` of `env.subject.card` (`cardOf`) to `zoneIdFor(zone, they)`. In a public zone it is face up.
- **`testing.ts`:**
  - `fixtureEnv` takes `runLine?: PhraseEnv['runLine']` and passes it on.
  - `deckGameText` gains these lines right after `'    Their spaces go back to the bank.'`:

```ts
'  When a player lands on a lucky space:', '    They draw from the lucky pile and do what it says.',
'  When a player lands on a fate space:', '    They draw from the fate pile and do what it says.',
```

- [ ] **Step 1: Write the failing tests.**

In `cards.test.ts`, `describe('buildCards')`:
- **Two sets.** Use the existing `two` (2 standard cards to `draw pile`, 3 color cards to `deck`) with `makeRng(3)`:
  - `cards.map((c) => c.zoneId)` is `['draw-pile', 'draw-pile', 'deck', 'deck', 'deck']`;
  - `[deckOf(two, 'c1'), deckOf(two, 'c2'), deckOf(two, 'c5'), deckOf(two, 'x2')]` is `[two[0], two[1], null, null]`.
- **One set gets what it always got.** With `const shuffled = shuffleWithRng(sets[0].identities, makeRng(7))`, `buildCards(sets, makeRng(7))` gives faceKeys equal to `shuffled.items.map((i) => i.faceKey)` and an rng equal to `shuffled.rng`.

In `zones.test.ts`:
- **A secret pile.** `fixtureColorGame()` has a secret `draw-pile` and a public `discard-pile`. Start with cards `a`, `b`, `c` in `draw-pile` at slots 0, 1, 2, with `c` face up.
  - `toBottom(s, 'c', 'draw-pile', game)` gives `[id, slot, faceUp]` of `[['c', 0, false], ['a', 1, false], ['b', 2, false]]`.
- **A public pile.** `toBottom(s, 'b', 'discard-pile', game)` gives `[['b', 0, true]]` there.

In `board-state.test.ts`:
- `lastDrawn` is null on a fresh state.
- After `setLastDrawn(s, { seat: 'p0', zone: 'the lucky pile', name: 'Dividend', says: 'They get 50 money.' })` it reads that back.
- `s.data[LAST_DRAWN_KEY]` survives `JSON.parse(JSON.stringify(…))`.

Create `library/draw-phrases.test.ts`, with these helpers:

```ts
const lib = createDefaultLibrary();
const LUCKY = 'lucky-pile';
const HEAD = '| name | says |';
const CALM = [HEAD, '| Calm | They get 0 money. |'];
const DIVIDEND = '| Dividend | They get 50 money. |';
function decks(lucky: string[], fate: string[] = CALM, rules: string[] = []): CompiledGame {
  const { game, diagnostics } = compileGame(deckGameText(lucky, fate, rules), lib);
  expect(diagnostics).toEqual([]);
  return game!;
}
/** p0 to move from `from` with `roll` to come; the named lucky cards go on top in the order given, so the last named is on top. */
function started(game: CompiledGame, roll: number[], opts: { from?: number; top?: string[]; players?: number; arrange?: (s: GameState) => GameState } = {}): GameEngine {
  const { from = 0, top = [], players = 2, arrange = (s: GameState) => s } = opts;
  let s: GameState = { ...withBoardData(initialState(game, 1), game, seatsFor(players)), turn: { current: 'p0', phase: 'playing' } };
  for (const name of top) s = relocate(s, [s.cards.find((c) => c.zoneId === LUCKY && c.data?.name === name)!.id], LUCKY, game);
  return createEngine(game, lib, players, arrange(queueRoll(placePiece(s, 'p0', from), roll))).engine;
}
const rollDice = (engine: GameEngine) => engine.dispatch({ type: 'roll the dice', by: 'p0' });
const names = (state: GameState, zoneId: string) => zoneCards(state, zoneId).map((c) => c.data?.name);
```

```ts
it('does what the top card says for the player who drew it, then puts it at the bottom face down', () => {
  const engine = started(decks([HEAD, DIVIDEND, '| Fine | They pay 15. |']), [1, 1], { top: ['Fine', 'Dividend'] });
  expect(rollDice(engine).ok).toBe(true);
  const s = engine.getState();
  expect(counterOf(s, 'money', 'p0')).toBe(1550);
  expect(names(s, LUCKY)).toEqual(['Dividend', 'Fine']);
  expect(zoneCards(s, LUCKY).every((c) => !c.faceUp)).toBe(true);
  expect(lastDrawn(s)).toEqual({ seat: 'p0', zone: 'the lucky pile', name: 'Dividend', says: 'They get 50 money.' });
});
it('reads “it” as the space their piece is on, again for each sentence', () => {
  const hop = '| Hop | Their piece goes straight to Rose Lane. If someone else owns it, they pay its rent to its owner. |';
  const engine = started(decks([HEAD, hop]), [1, 1], { arrange: (s) => setOwner(s, 4, 'p1') });
  rollDice(engine);
  expect(['p0', 'p1'].map((seat) => counterOf(engine.getState(), 'money', seat))).toEqual([1486, 1514]);
});
it('Review Focus: a card that lands its player on another space of its pile draws the next card, never itself again', () => {
  // From Power Works (7), 1 and 2 passes Go and lands on Lucky (2); Again walks the same 3 to the other Lucky (5).
  const engine = started(decks([HEAD, DIVIDEND, '| Again | Their piece moves forward by the roll. |']), [1, 2], { from: 7, top: ['Dividend', 'Again'] });
  rollDice(engine);
  const s = engine.getState();
  expect([pieceAt(s, 'p0'), counterOf(s, 'money', 'p0')]).toEqual([5, 1750]);
  expect(names(s, LUCKY)).toEqual(['Dividend', 'Again']);
  expect(zoneCards(s, LUCKY).every((c) => !c.faceUp)).toBe(true);
  expect(lastDrawn(s)!.name).toBe('Dividend');
});
```

Also add these to the same file:
- **Keeping.** Use `decks([HEAD, DIVIDEND, '| Free Pass | They keep this card in their kept cards. |'])` with `top: ['Free Pass']` and roll `[1, 1]`. After the roll:
  - `names(s, 'kept-cards-p0')` is `['Free Pass']`, and that card is face up;
  - `names(s, LUCKY)` is `['Dividend']`;
  - p0 still has 1500.
- **An empty pile.** With `const game = decks([HEAD, DIVIDEND])`, use `arrange: (s) => relocate(s, zoneCards(s, LUCKY).map((c) => c.id), BOX_ZONE, game)`. `rollDice(engine)` throws `There is no card to draw in the lucky pile.`
- **No says column.** Use `decks([HEAD, DIVIDEND], ['| name |', '| Calm |'])` and roll `[3, 3]`, onto Fate. It throws `The card drawn from the fate pile says nothing to do: its deck has no says column.`
- **Cards that draw cards.** Use `decks([HEAD, '| Loop | They draw from the lucky pile and do what it says. |'])` and roll `[1, 1]`. It throws `Cards keep drawing cards without stopping.`
- **Keeping outside a card.** Compile `deckGameText([HEAD, DIVIDEND], CALM, ['  When a player has less than 1 money:', '    They keep this card in their kept cards.'])`. Its only diagnostic is on that line: `“They keep this card in their kept cards” only makes sense in a card's says column.`

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/cards.test.ts src/engine/core/lang/zones.test.ts src/engine/core/lang/board-state.test.ts src/engine/core/lang/library/draw-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Keep "chance", "treasury" and the banned words out of `draw-phrases.ts`, comments included.
- [ ] **Step 4: Run** the four files, then `bun run test` and `bun run typecheck`. Hearts, Color Match and Venom pass unchanged; their single set still gets the same cards.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/cards.ts src/engine/core/lang/zones.ts src/engine/core/lang/board-state.ts src/engine/core/lang/types.ts \
  src/engine/core/lang/runtime.ts src/engine/core/lang/phrases.ts src/engine/core/lang/compile-util.ts src/engine/core/lang/compile.ts \
  src/engine/core/lang/library/draw-phrases.ts src/engine/core/lang/library/index.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/compile-util.test.ts src/engine/core/lang/cards.test.ts \
  src/engine/core/lang/zones.test.ts src/engine/core/lang/board-state.test.ts src/engine/core/lang/library/draw-phrases.test.ts
git commit -m "feat(lang): drawing a card and doing what it says, keeping it, and the last card drawn"
```

---

### Task 3: Moves that pass Go, and moving back

**Files:**
- Modify: `src/engine/core/lang/library/board-phrases.ts`
- Test: `src/engine/core/lang/library/board-phrases.test.ts`

**Interfaces:**
- **`walk(env: PhraseEnv, steps: number): GameState`** (file-private) is today's `moveByRoll` body with the step count passed in.
  - It walks space by space, announcing a pass on each, the last included, then a land.
  - It stops early, with no landing, when a passes rule moves the piece or takes the player out.
  - A player with no piece throws `They have no piece on the board.`
  - `moveByRoll` becomes `walk(env, rollTotal(env.state))`, so the "needs a roll first" message still comes first.
- **New effects,** each with options `{ needsPlayer: true, needsBoard: true }`:
  - `'their piece moves forward to {space}'` walks `((target - from - 1 + count) % count) + 1` steps. From the target itself, that is once round the board.
  - `'their piece moves forward to the nearest {spacekind}'` walks to the first space ahead (from + 1, …, from + count) whose `attrs[kind.attribute]` is one of `kind.values`. Every kind the language reads is on the board, so one is always ahead.
  - `'their piece moves back {int} space(s)'`:
    - It places the piece `n` spaces back, wrapping past Go backwards, and announces only the landing. Nothing is passed going backwards.
    - `n < 1` throws RuleError `Say how many spaces back, 1 or more.`
    - A player with no piece throws `They have no piece on the board.`

- [ ] **Step 1: Write the failing tests** in `board-phrases.test.ts`, in a new `describe('moving forward to a space, and back')`. The loop is `FIXTURE_SPACES`: Go 0, Mill Lane 1, Income Tax 2, North Station 3, Chance 4, Rose Lane 5, Power Works 6, Chance 7.

```ts
/** Where p0's piece ends and every moment on the way, from `from`. */
const walked = (text: string, from: number) => {
  const seen: string[] = [];
  const announce = (s: GameState, m: Moment) => { seen.push(`${m.kind} ${m.space}`); return s; };
  const s = runPhrase<GameState>(lib, 'effect', text, env(placePiece(fixtureBoardState(), 'p0', from), { ...as('p0'), announce }));
  return { at: pieceAt(s, 'p0'), seen };
};
it('walks forward to the space, passing every space on the way and the space itself, then lands', () => {
  expect(walked('their piece moves forward to Go', 5)).toEqual({ at: 0, seen: ['pass 6', 'pass 7', 'pass 0', 'land 0'] });
  expect(walked('their piece moves forward to Mill Lane', 1).seen).toHaveLength(9);
});
it('walks forward to the first space of the kind ahead, never the one it is on', () => {
  expect(walked('their piece moves forward to the nearest utility', 4)).toEqual({ at: 6, seen: ['pass 5', 'pass 6', 'land 6'] });
  expect(walked('their piece moves forward to the nearest station', 4).seen.at(-1)).toBe('land 3');
  expect(walked('their piece moves forward to the nearest chance', 4).at).toBe(7);
});
it('moves back without passing anything, going round past Go backwards', () => {
  expect(walked('their piece moves back 3 spaces', 1)).toEqual({ at: 6, seen: ['land 6'] });
  expect(walked('their piece moves back 1 space', 4)).toEqual({ at: 3, seen: ['land 3'] });
});
```

Also add these:
- **Moving back 0.** `their piece moves back 0 spaces` throws `Say how many spaces back, 1 or more.`
- **No piece.** After `markOut(fixtureBoardState(), 'p1')`, both `their piece moves forward to Go` and `their piece moves back 3 spaces` (subject p1) throw `They have no piece on the board.`
- **A walk cut short.** For `their piece moves forward to Go` from 5, an announce that moves the piece to 2 on the first pass leaves `seen` as `['pass 6']`, with the piece on 2.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/board-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** The slice 1 `moving` tests must pass unchanged.
- [ ] **Step 4: Run** the file, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/board-phrases.ts src/engine/core/lang/library/board-phrases.test.ts
git commit -m "feat(lang): moves that pass Go: forward to a space or to the nearest of a kind, and back without passing"
```

---

### Task 4: Money between players, paying for buildings, and returning a kept card

**Files:**
- Modify: `src/engine/core/lang/library/board-phrases.ts` (two effects; export `transfer`)
- Modify: `src/engine/core/lang/library/fact-phrases.ts` (one effect)
- Modify: `src/engine/core/lang/library/draw-phrases.ts` (one condition, one effect)
- Test: `src/engine/core/lang/library/board-phrases.test.ts`, `src/engine/core/lang/library/fact-phrases.test.ts`, `src/engine/core/lang/library/draw-phrases.test.ts`

**Interfaces:**
- Consumes `deckOf`, `toBottom` and the `draw-phrases.test.ts` helpers (Task 2).
- **`board-phrases.ts`:**
  - `export function transfer(env: PhraseEnv, from: PlayerId, to: PlayerId | null, amount: number): GameState` is unchanged, now exported.
  - Effect `'they pay {int} {counter} to each other player'` (needsPlayer) moves n of that counter from them to each other player in `playersIn`, in seat order.
  - Effect `'they get {int} {counter} from each other player'` (needsPlayer) does the reverse. A player is charged even below 0, and the game's own rules then deal with that.
- **`fact-phrases.ts`:** effect `'they pay {int} for each of their {banked}'` (needsPlayer, needsBoard, needsPayment).
  - It takes `fact = factForBank(env, banked)`. That is the same pairing as "go back to the bank": `houses` is the count, and `hotels` is the flag `hotel`.
  - It pays the bank `n × Σ heldBy(state, space, fact.name)` over the spaces they own, through `transfer(env, they, null, …)`.
- **`draw-phrases.ts`:**
  - Condition `'their {perzone} has {card}'` (needsPlayer) holds when a card of `zoneIdFor(zone, they)` matches.
  - Effect `'{card} from their {perzone} goes to the bottom of the pile it came from'` (needsPlayer):
    - It takes the first matching card of their zone in slot order and moves it with `toBottom` to `zoneIdFor(deckOf(env.game.cards, id)!.start)`. A card always goes back to its own deck's pile, whatever its name.
    - With none, it throws RuleError `` `There is no ${what} in their ${zone}.` ``, where `what` is `describeCard(match)` without its leading article: "There is no Free Pass in their kept cards."

- [ ] **Step 1: Write the failing tests.**

In `board-phrases.test.ts`, add `describe('paying and collecting from each other player')`:
- **Setup.** `seats = ['p0', 'p1', 'p2']`, `money = (s) => seats.map((seat) => counterOf(s, 'money', seat))`, and a start of `fixtureBoardState(game, seats)`.
- **Paying.** `they pay 50 money to each other player` (p0) gives `[1400, 1550, 1550]`.
- **Collecting.** `they get 50 money from each other player` (p0), with p1 set to 30, gives `[1600, -20, 1450]`.
- **Review Focus.** After `markOut(start, 'p2')`, the two phrases give `[1450, 1550, 1500]` and `[1550, 1450, 1500]`. p2 is left as it was.

In `fact-phrases.test.ts`, import `counterOf`:

```ts
describe('paying for each building', () => {
  it('Review Focus: charges for the houses and hotels on their own spaces only, a hotel once', () => {
    // p0: Mill Lane (1) with 2 houses, Rose Lane with a hotel; p1: Lily Lane with 3 houses.
    const owned = withHotel(withHouses(withHouses(setOwner(setOwner(setOwner(fresh(), 1, 'p0'), ROSE, 'p0'), LILY, 'p1'), 1, 2), LILY, 3), ROSE);
    const housed = effect('they pay 25 for each of their houses', owned, null);
    expect([counterOf(housed, 'money', 'p0'), counterOf(housed, 'money', 'p1')]).toEqual([1450, 1500]);
    expect(counterOf(effect('they pay 100 for each of their hotels', owned, null), 'money', 'p0')).toBe(1400);
    expect(counterOf(effect('they pay 25 for each of their houses', fresh(), null), 'money', 'p0')).toBe(1500);
  });
});
```

In `draw-phrases.test.ts`, add `describe('using a kept card', …)`. It holds `PASS = '| Free Pass | They keep this card in their kept cards. |'`, this button and this game:

```ts
const USE = ['  A player may use a Free Pass.', '    Only if their kept cards has a Free Pass.', '    Then:',
  '      A Free Pass from their kept cards goes to the bottom of the pile it came from.'];
const game = decks([HEAD, DIVIDEND, PASS], [HEAD, '| Calm | They get 0 money. |', PASS], USE);
/** The Free Pass of the deck that starts in `pile`. */
const passOf = (pile: string) => initialState(game, 1).cards
  .find((c) => c.data?.name === 'Free Pass' && zoneIdFor(deckOf(game.cards, c.id)!.start) === pile)!.id;
it('greys the button until they keep one, and each card goes back under the pile its own deck starts in', () => {
  const [lucky, fate] = [passOf('lucky-pile'), passOf('fate-pile')];
  expect(started(game, [1, 1]).canDispatch({ type: 'use a free pass', by: 'p0' })).toBe('their kept cards has a Free Pass');
  const engine = started(game, [1, 1], { arrange: (s) => relocate(s, [fate, lucky], 'kept-cards-p0', game) });
  expect(engine.dispatch({ type: 'use a free pass', by: 'p0' }).ok).toBe(true);
  expect(engine.dispatch({ type: 'use a free pass', by: 'p0' }).ok).toBe(true);
  const s = engine.getState();
  expect(zoneCards(s, 'kept-cards-p0')).toEqual([]);
  expect([zoneCards(s, 'lucky-pile')[0].id, zoneCards(s, 'fate-pile')[0].id]).toEqual([lucky, fate]);
  expect(s.cards.filter((c) => c.id === lucky || c.id === fate).every((c) => !c.faceUp)).toBe(true);
});
```

Also add these:
- **No such card.** Run the effect through `runPhrase(lib, 'effect', 'a Free Pass from their kept cards goes to the bottom of the pile it came from', fixtureEnv(state, { game, seats: ['p0', 'p1'], subject: { player: 'p0', space: null, card: null } }))` on a fresh started state. It throws `There is no Free Pass in their kept cards.`
- **Review Focus.** Use `decks([HEAD, '| Party | They get 50 money from each other player. |'])` with `players: 3`, p1 set to 30 money, and roll `[1, 1]`. Afterwards:
  - p0 has 1600 and p2 has 1450;
  - `isOut(s, 'p1')` is true.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/board-phrases.test.ts src/engine/core/lang/library/fact-phrases.test.ts src/engine/core/lang/library/draw-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Keep the banned words out of the new code and comments: say "counter", "bank item", "a space's count".
- [ ] **Step 4: Run** the three files, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/board-phrases.ts src/engine/core/lang/library/fact-phrases.ts src/engine/core/lang/library/draw-phrases.ts \
  src/engine/core/lang/library/board-phrases.test.ts src/engine/core/lang/library/fact-phrases.test.ts src/engine/core/lang/library/draw-phrases.test.ts
git commit -m "feat(lang): paying and collecting from each other player, paying for each building, and returning a kept card to its pile"
```

---

### Task 5: Seat views show the last card drawn and the cards players keep in view

**Files:**
- Modify: `src/engine/core/lang/board-view.ts`
- Modify: `src/pages/designer/board-parts.test.tsx` (its `board()` fixture gains `lastDrawn: null, playerCards: {}`, which typecheck needs), and any other hand-built `BoardView` in tests
- Test: `src/engine/core/lang/board-view.test.ts`

**Interfaces:**
- Consumes `lastDrawn`/`LastDrawn` (Task 2) and `cardName` (Task 1).
- **`BoardView.lastDrawn: LastDrawn | null`** is the same for every seat. Nothing else about a pile is in the view.
- **`BoardView.playerCards: { [seat: string]: string[] }`** has one entry for every seat of the game.
  - Each entry holds the `cardName`s of the cards in that seat's per-player zones whose visibility is `public`, zone by zone in Table order and slot by slot.
  - The list is `[]` when there are none. A zone only its owner can see is never listed.
- **`readSeatExtras`** requires both:
  - `lastDrawn` is null or a record of four strings (`seat`, `zone`, `name`, `says`);
  - `playerCards` is a map of string lists.

- [ ] **Step 1: Write the failing tests** in `board-view.test.ts`, in a new `describe('seat views of a board with cards')`.
- **Fixtures.**
  - `LUCKY = ['| name | says |', '| Free Pass | They keep this card in their kept cards. |', '| Dividend | They get 50 money. |']` and `FATE = ['| name | says |', '| Calm | They get 0 money. |']`.
  - `built = compileGame(deckGameText(LUCKY, FATE), lib)`.
  - A local `started` like Task 2's: p0 to move on Go, the named lucky card on top, and `[1, 1]` queued, onto Lucky.
- **Compiles** with no diagnostics.
- **Last drawn.**
  - Before the roll, both seats' `board!.lastDrawn` is null.
  - With Dividend on top, after p0 rolls, both seats' `lastDrawn` equals `{ seat: 'p0', zone: 'the lucky pile', name: 'Dividend', says: 'They get 50 money.' }`.
- **Kept cards.** With Free Pass on top, after the roll both seats' `playerCards` equals `{ p0: ['Free Pass'], p1: [] }`. Before it, they equal `{ p0: [], p1: [] }`.
- **Review Focus.**
  - Use `deckGameText(LUCKY, FATE).replace('  Each player has a kept cards row that everyone can see.', '  Each player has a kept cards row that everyone can see.\n  Each player has a hand that only they can see.')`, with Dividend moved into `hand-p0`.
  - For both seats, `playerCards` is `{ p0: [], p1: [] }`.
  - `JSON.stringify(seatExtras(…))` contains neither `Dividend` nor `Free Pass`.
- **Plain data.**
  - `readSeatExtras(JSON.parse(JSON.stringify(extras)))` equals `extras` after a draw.
  - It gives null for `lastDrawn: { seat: 'p0' }`, for `playerCards: { p0: [1] }` and for a missing `playerCards`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test and `bunx vitest run src/pages/designer`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/board-view.ts src/engine/core/lang/board-view.test.ts src/pages/designer/board-parts.test.tsx
git commit -m "feat(lang): seat views show the last card drawn and the cards each player keeps where everyone can see"
```

---

### Task 6: Rent Day, slice 4

**Files:**
- Modify: `src/games/rent-day.rules`
- Modify: `src/games/rent-day.test.ts`
- Modify: `src/pages/designer/playtest.tsx` (the card-table rule, ruling 5)
- Modify: `src/pages/designer/playtest.test.tsx` and `src/pages/designer/designer-page.test.tsx` (they read Rent Day's seeds, its card table and its example count)

**Interfaces:**
- Consumes every phrase above, `deckOf` (Task 2), `lastDrawn`/`LAST_DRAWN_KEY` (Task 2), and `zoneIdFor`/`zoneInfo` (`zones.ts`).
- **New move type:** `'use a get out of jail free'`, labelled `Use a Get Out Of Jail Free`. Ruling 1: there is no "card" in its wording.
- **Board numbers:**
  - Go 0, Treasury 2, Ferry Row 3, Income Tax 4, Chance 7, Jail 10;
  - East Station 15, Treasury 17, Chance 22, Bell Square 24, Go To Jail 30;
  - Crown Row 31, Treasury 33, Chance 36, The Promenade 39.
- **Zones:** `chance-pile`, `treasury-pile` and `kept-cards-p<n>`.
- **`playtest.tsx`:** the card table is drawn when `tableDef.zones.length > 0 && (game.board === null || game.phases.some((p) => p.moves.length > 0))`.
  - A card game keeps its table.
  - A board game gets one only when some phase moves cards.
  - It is decided from the game, not the view, so nothing mounts before the first view arrives.

- [ ] **Step 1: Insert** these sections between `Players: 2 to 8` (and its blank line) and `Board:`:

```text
Cards:
  A deck called chance cards, starting in the chance pile:
    | name                           | says                                                                                                       | copies |
    | Advance To Go                  | Their piece moves forward to Go.                                                                           | 1      |
    | Advance To Bell Square         | Their piece moves forward to Bell Square.                                                                  | 1      |
    | Advance To Dock Road           | Their piece moves forward to Dock Road.                                                                    | 1      |
    | Advance To The Nearest Utility | Their piece moves forward to the nearest utility.                                                          | 1      |
    | Advance To The Nearest Station | Their piece moves forward to the nearest station. If someone else owns it, they pay its rent to its owner. | 2      |
    | Bank Pays A Dividend           | They get 50 money.                                                                                         | 1      |
    | Get Out Of Jail Free           | They keep this card in their kept cards.                                                                   | 1      |
    | Go Back Three Spaces           | Their piece moves back 3 spaces.                                                                           | 1      |
    | Go To Jail                     | Their piece goes straight to Jail. They are in jail.                                                       | 1      |
    | General Repairs                | They pay 25 for each of their houses. They pay 100 for each of their hotels.                               | 1      |
    | Speeding Fine                  | They pay 15.                                                                                               | 1      |
    | A Trip To North Station        | Their piece moves forward to North Station.                                                                | 1      |
    | A Walk On The Promenade        | Their piece moves forward to The Promenade.                                                                | 1      |
    | Chair Of The Board             | They pay 50 money to each other player.                                                                    | 1      |
    | Building Loan Matures          | They get 150 money.                                                                                        | 1      |
  A deck called treasury cards, starting in the treasury pile:
    | name                      | says                                                                         | copies |
    | Advance To Go             | Their piece moves forward to Go.                                             | 1      |
    | Bank Error In Your Favour | They get 200 money.                                                          | 1      |
    | Doctor's Fee              | They pay 50.                                                                 | 1      |
    | Sale Of Stock             | They get 50 money.                                                           | 1      |
    | Get Out Of Jail Free      | They keep this card in their kept cards.                                     | 1      |
    | Go To Jail                | Their piece goes straight to Jail. They are in jail.                         | 1      |
    | Opera Night               | They get 50 money from each other player.                                    | 1      |
    | Holiday Fund Matures      | They get 100 money.                                                          | 1      |
    | Tax Refund                | They get 20 money.                                                           | 1      |
    | Life Insurance Matures    | They get 100 money.                                                          | 1      |
    | Hospital Fees             | They pay 100.                                                                | 1      |
    | School Fees               | They pay 50.                                                                 | 1      |
    | Consultancy Fee           | They get 25 money.                                                           | 1      |
    | Street Repairs            | They pay 40 for each of their houses. They pay 115 for each of their hotels. | 1      |
    | Beauty Contest Prize      | They get 10 money.                                                           | 1      |
    | Inheritance               | They get 100 money.                                                          | 1      |

Table:
  The chance pile is a pile in the center that no one can see.
  The treasury pile is a pile in the center that no one can see.
  Each player has a kept cards row that everyone can see.
```

- [ ] **Step 2: Insert** this between the end of `Board:` (after `  Players can have jail turns.` and its blank line) and `Rent:`:

```text
Setup:
  Shuffle the chance pile.
  Shuffle the treasury pile.
```

- [ ] **Step 3: In `Phase: playing`,** add the button right after the `A player may roll for a double.` block, before the buy button:

```text
  A player may use a Get Out Of Jail Free.
    Only if they are in jail.
    Only if they have not rolled this turn.
    Only if their kept cards has a Get Out Of Jail Free.
    Then:
      They are not in jail.
      Their jail turns go back to 0.
      A Get Out Of Jail Free from their kept cards goes to the bottom of the pile it came from.
```

Then add the landing rules right after `When a player lands on a tax space:` and its line:

```text
  When a player lands on a chance space:
    They draw from the chance pile and do what it says.
  When a player lands on a treasury space:
    They draw from the treasury pile and do what it says.
```

- [ ] **Step 4: Fix the top card** of the one earlier example that now lands on Chance. In `Example: you cannot buy a space that has no price`, the first line `Given p0 is on Go` becomes these two lines, and the rest is unchanged:

```text
  Given the chance pile has a Building Loan Matures
  And p0 is on Go
```

- [ ] **Step 5: Append these 11 examples** after the existing 45, for 56 in all. Piles are listed bottom to top (ruling 4), and a Given replaces a pile's cards with the ones it names.

```text
Example: Advance To Go collects 200
  Given the chance pile has an Advance To Go
  And p0 is on Go
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 is on Go
  And p0 has 1700 money

Example: a card that moves past Go pays the salary
  Given the chance pile has an Advance To Bell Square
  And p0 is on Crown Row
  And the next roll is 2 and 3
  When p0 rolls the dice
  Then p0 is on Bell Square
  And p0 has 1700 money

Example: the nearest station charges double rent
  Given p1 owns East Station
  And the chance pile has an Advance To The Nearest Station
  And p0 is on Go
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 is on East Station
  And p0 has 1450 money
  And p1 has 1550 money

Example: Go Back Three Spaces lands without passing
  Given the chance pile has a Go Back Three Spaces
  And p0 is on Go
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 is on Income Tax
  And p0 has 1300 money

Example: a Go To Jail card sends you to jail
  Given the chance pile has a Go To Jail
  And p0 is on Go
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 is on Jail
  And p0 is in jail
  And p0 has 1500 money

Example: paying each other player
  Given 3 players
  And the chance pile has a Chair Of The Board
  And p0 is on Go
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 has 1400 money
  And p1 has 1550 money
  And p2 has 1550 money

Example: collecting from each other player
  Given 3 players
  And the treasury pile has an Opera Night
  And p0 is on Go
  And the next roll is 1 and 1
  When p0 rolls the dice
  Then p0 has 1600 money
  And p1 has 1450 money
  And p2 has 1450 money

Example: general repairs charge for each house
  Given p0 owns Mill Lane
  And p0 owns Ferry Row
  And Mill Lane has 2 houses
  And Ferry Row has 2 houses
  And the chance pile has a General Repairs
  And p0 is on Go
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 has 1400 money

Example: keeping a Get Out Of Jail Free
  Given the chance pile has a Speeding Fine and a Get Out Of Jail Free
  And p0 is on Go
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0's kept cards has a Get Out Of Jail Free
  And the chance pile has a Speeding Fine
  And p0 has 1500 money

Example: using a Get Out Of Jail Free
  Given p0 is on Jail
  And p0 is in jail
  And p0's kept cards has a Get Out Of Jail Free
  When p0 uses a Get Out Of Jail Free
  Then it is accepted
  And p0 is not in jail
  And p0's kept cards are empty

Example: a drawn card goes to the bottom of its pile
  Given the chance pile has a Speeding Fine and a Bank Pays A Dividend
  And p0 is on Go
  And the next roll is 3 and 4
  When p0 rolls the dice
  Then p0 has 1550 money
  And the top card of the chance pile is a Speeding Fine
```

How each number comes from the board:
- 3 + 4 from Go lands on Chance (7), and 1 + 1 lands on Treasury (2).
- Advance To Go walks 8 … 39 and onto Go, passing it: +200.
- 2 + 3 from Crown Row (31) lands on Chance (36), and Bell Square is reached past Go: +200.
- The nearest station ahead of 7 is East Station (15), with one station's rent of 25, charged once on landing and once by the card.
- 7 − 3 is Income Tax (4), which charges 200.
- Repairs: 4 houses × 25 = 100.

- [ ] **Step 6: Extend `rent-day.test.ts`.**
  - **Examples:** `results` has length 56, and all pass.
  - **Constants:**
    - `USE = 'use a get out of jail free'`, `KEPT = 'kept cards'`, `PASS_CARD = 'Get Out Of Jail Free'`;
    - `DRAW_KINDS = ['chance', 'treasury']`, `DECK_SIZE = 16`.
  - **The auto-player (`playTurn`)** first presses USE whenever it may: `if (may(USE)) make({ type: USE, by });`. That comes before the even seat's PAY. The rest is unchanged.
  - **`keepsTheRules`.**
    - **`walks`.** When `landed.kind` is in `DRAW_KINDS`, a card was drawn there, and its lines may move money and the piece further. The examples check each card. So the check is only that:
      - `after.data[LAST_DRAWN_KEY]` is not the same object as before;
      - `lastDrawn(after)!.seat` is the mover.
      Then it returns. Every other walk is checked as today.
    - **USE.**
      - Nobody's money changes.
      - The mover is not in jail after, and has 0 jail turns.
      - Their kept cards hold one card fewer than before.
    - **Cards, after every move.**
      - There are 32 cards.
      - Each card is either face down in its own deck's pile (`zoneIdFor(deckOf(game.cards, id)!.start)`), or face up in a seat's `kept cards` zone (`zoneInfo(…)?.spec.name === KEPT`) and named `Get Out Of Jail Free`.
      - Each deck has `DECK_SIZE` cards in all.
      - So each pile plus every player's kept cards always holds its deck exactly. A player who goes out keeps their kept card (bankruptcy is slice 5), and it is still counted.
    - The houses, hotels, jail and turn-log checks stay.
  - **2-player ending.**
    - The test stays: at least 9 of seeds 1 to 10 reach a winner within 3000 turns.
    - The jail tallies classify a ROLL that puts a player in jail as one of three:
      - a third double;
      - else landing on GO_TO_JAIL (`(pieceAt(before) + total) % 40`);
      - else `'sent to jail by a card'`.
    - A USE adds to `'used a Get Out Of Jail Free'`.
    - Every tally, the two new ones included, must be above 0.
  - **4 and 8 players with full sets:** unchanged, seeds 1, 2 and 3 within 5000 turns. If a seed doesn't finish, try the next seed and say so in the commit. Don't raise the cap past 20000.
  - **The lean variant** (300 money, no Go salary) also removes the two draw rules, because cards bring money in.
    - Set `const draws = '  When a player lands on a chance space:\n    They draw from the chance pile and do what it says.\n  When a player lands on a treasury space:\n    They draw from the treasury pile and do what it says.\n'`.
    - Assert `expect(RENT_DAY).toContain(draws)` and replace it with `''`.
    - The comment says money then only leaves the table.
- [ ] **Step 7: Rule 5 and the page tests that read Rent Day.**
  - In `playtest.tsx`, the card table follows the rule in Interfaces.
  - In `playtest.test.tsx`:
    - **The no-card-table test.** It becomes `keeps the status line of each seat, and draws no card table for a board game whose phases move no cards`, and `rendered` is still 0.
    - **The first roll.** Building the cards (15 + 15 draws) and Setup's two shuffles (15 + 15) come before it, so seed 1's first roll is now 4 and 2 (draws 60 and 61), not a double:
      - "rolls on press" expects `Rolled 4 and 2`;
      - its comment says so.
    - **The broke seed.** `BROKE_SEED` becomes 2, which rolls 3 and 1 onto Income Tax. Its comment says so.
    - **If the rolls differ.** If seed 1 does not roll 4 and 2, the rng is used in another order than the plan's (sets in Cards order, then the two Setup lines). Find why before changing a number.
  - In `designer-page.test.tsx`:
    - `56 of 56 examples pass`;
    - the test name says 56.
- [ ] **Step 8: Run** `bunx vitest run src/games/rent-day.test.ts src/pages/designer`. Fix any failure in the phrases, not in the example numbers: the numbers come from the board above. Then run `bun run test` and `bun run typecheck`.
- [ ] **Step 9: Commit**

```bash
git add src/games/rent-day.rules src/games/rent-day.test.ts src/pages/designer/playtest.tsx src/pages/designer/playtest.test.tsx src/pages/designer/designer-page.test.tsx
git commit -m "feat(games): Rent Day slice 4: Chance and Treasury piles, cards that move, pay and charge, and Get Out Of Jail Free"
```

---

### Task 7: The playtest shows the last card drawn and kept cards; README

**Files:**
- Modify: `src/pages/designer/board-grid.tsx`, `src/pages/designer/board-controls.tsx`, `README.md`
- Test: `src/pages/designer/board-parts.test.tsx`, `src/pages/designer/playtest.test.tsx`

**Interfaces:**
- Consumes `BoardView.lastDrawn` and `BoardView.playerCards` (Task 5).
- **Last-drawn panel.** `BoardGrid` draws it in the board's middle, under the dice, when `board.lastDrawn !== null`.
  - It is `<div data-testid="last-drawn">` holding one text: `` `${seat} drew from ${zone}: ${name} — ${says}` ``, for example `p0 drew from the chance pile: Advance To Go — Their piece moves forward to Go.`
  - It must not use `role="status"`: the picking banner is the page's status.
  - The look is the builder's. It stays until the next draw.
- **Money line.** A seat still in reads its numbers, then its facts, then the names of its kept cards: `p0 1,500 money · in jail · Get Out Of Jail Free`. A seat that is out still reads only `p2 out`.
- No page code names a card or a pile.

- [ ] **Step 1: Write the failing tests.**

In `board-parts.test.tsx`:

```ts
describe('cards on a board', () => {
  it('shows the last card drawn in the middle of the board, and nothing before a draw', () => {
    const spaces = Array.from({ length: 12 }, (_, i) => space(`Space ${i}`));
    const { rerender } = render(<BoardGrid board={board({ spaces })} />);
    expect(screen.queryByTestId('last-drawn')).toBeNull();
    rerender(<BoardGrid board={board({ spaces, lastDrawn: { seat: 'p0', zone: 'the lucky pile', name: 'Dividend', says: 'They get 50 money.' } })} />);
    expect(screen.getByTestId('last-drawn').textContent).toBe('p0 drew from the lucky pile: Dividend — They get 50 money.');
  });
  it('lists the cards a seat keeps after its numbers and facts, and nothing after a seat that is out', () => {
    render(<MoneyLine board={board({ out: ['p2'], playerFacts: { p0: { asleep: true } }, playerCards: { p0: ['Free Pass'], p1: ['Free Pass', 'Lucky Charm'], p2: ['Free Pass'] } })} />);
    expect(screen.getByText('p0 1,500 money · asleep · Free Pass')).toBeTruthy();
    expect(screen.getByText('p1 1,234,567 money · Free Pass · Lucky Charm')).toBeTruthy();
    expect(screen.getByText('p2 out')).toBeTruthy();
  });
});
```

In `playtest.test.tsx` (import `queueRoll` from board-state and `relocate` from `@/engine/core/lang/zones`):

```ts
describe('Playtest: drawing a card', () => {
  const start = { ...withBoardData(initialState(rentDay, SEED), rentDay, ['p0', 'p1']), turn: { current: 'p0', phase: 'playing' } };
  const named = (name: string) => start.cards.find((c) => c.zoneId === 'chance-pile' && c.data?.name === name)!.id;
  /** p0 on Go with the named card on top of the chance pile and 3 and 4 to roll, onto Chance. */
  const onTop = (name: string) => queueRoll(relocate(start, [named(name)], 'chance-pile', rentDay), [3, 4]);

  it('shows the card drawn in the middle of every board', () => {
    mountRentDay({ players: 2, initial: onTop('Bank Pays A Dividend') });
    expect(screen.queryAllByTestId('last-drawn')).toHaveLength(0);
    fireEvent.click(rollButtons()[0]);
    expect(screen.getAllByText('p0 drew from the chance pile: Bank Pays A Dividend — They get 50 money.')).toHaveLength(2);
    expect(screen.getAllByText('p0 1,550 money')).toHaveLength(2);
  });
  it('lists a kept card on every money line, and the button greys with its reason', () => {
    mountRentDay({ players: 2, initial: onTop('Get Out Of Jail Free') });
    fireEvent.click(rollButtons()[0]);
    expect(screen.getAllByText('p0 1,500 money · Get Out Of Jail Free')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Use a Get Out Of Jail Free' })[0].getAttribute('title')).toBe('they are in jail');
  });
  it('frees a player in jail who keeps one, and the card leaves their money line', () => {
    const jailed = setPlayerFact(placePiece(relocate(start, [named('Get Out Of Jail Free')], 'kept-cards-p0', rentDay), 'p0', 10), 'p0', 'in jail', true);
    mountRentDay({ players: 2, initial: jailed });
    expect(screen.getAllByText('p0 1,500 money · in jail · Get Out Of Jail Free')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Use a Get Out Of Jail Free' })[0]);
    expect(screen.getAllByText('p0 1,500 money')).toHaveLength(2);
    expect(rollButtons()[0].getAttribute('aria-disabled')).toBe('false');
  });
});
```

- [ ] **Step 2: Run** `bunx vitest run src/pages/designer`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Check it in the browser.**
  - Run `bun run dev`, open `/#designer`, load Rent Day and press Play with 2 players.
  - Write a throwaway Playwright script (Playwright is installed globally) in your own scratchpad directory, never in the repo.
  - It presses the current seat's enabled `Roll the dice` (again while it stays enabled after a double), then `End your turn`, until a `[data-testid="last-drawn"]` appears. Then it checks three things and takes a screenshot:
    - both seats' boards show the same last-drawn text;
    - the page has no `canvas` (no card table for Rent Day);
    - `Use a Get Out Of Jail Free` is on every seat's panel and greyed, with a reason on hover.
  - Look at the screenshot: the panel sits inside the board's middle and does not push the board out of shape.
- [ ] **Step 5: Run** `bunx vitest run src/pages/designer`, then `bun run test` and `bun run typecheck`. Then run the three checks below:
  - the first prints only the `library/index.ts` import of `./rent-day`;
  - the second and third print nothing.

```bash
grep -rniE '\b(jail|rent|houses?|hotels?|streets?|stations?|utilit(y|ies)|money)\b' src/engine/core/lang --include=*.ts | grep -v '\.test\.ts' | grep -v 'library/rent-day.ts' | grep -v 'lang/testing.ts'
grep -rniE '\b(chance|treasury)\b|get out of jail free' src/engine src/pages --include=*.ts --include=*.tsx | grep -v '\.test\.' | grep -v 'lang/testing.ts'
grep -rniw jail src/pages/designer | grep -v '\.test\.'
```

- [ ] **Step 6: Update the README.**
  - Under *Designing a game*, change "with 45 examples" to "with 56 examples".
  - After the **Doubles.** paragraph, add a **Cards that say what they do.** paragraph covering these points:
    - A board game may have `Cards:` and `Table:` too.
    - A deck's `says` column holds sentences, each a line about the player who draws the card. "It" is the space their piece is on, read again for each sentence. A sentence the library doesn't know is flagged on the card's row.
    - `They draw from the chance pile and do what it says.` puts the card at the bottom of the pile afterwards, unless it said `They keep this card in their kept cards.`
    - A button gives a kept card back with `A Get Out Of Jail Free from their kept cards goes to the bottom of the pile it came from.`, which means the pile its deck starts in.
    - Moves: `Their piece moves forward to Go.` passes every space on the way, Go included. `… to the nearest station.` goes to the first one ahead. `Their piece moves back 3 spaces.` passes nothing.
    - Money between players: `They pay 50 money to each other player.`, `They get 50 money from each other player.` and `They pay 25 for each of their houses.`
    - In the playtest, the last card drawn is shown in the middle of every board, and kept cards follow the player's numbers (`p0 1,500 money · Get Out Of Jail Free`).
    - A board game whose phases move no cards by hand shows no card table.
  - In the roadmap, mark slice 4 shipped: "slice 4 (Chance and Treasury cards: cards whose `says` column holds rules, drawing, keeping and using a card, moves that pass Go, and money between all players)".
- [ ] **Step 7: Commit**

```bash
git add src/pages/designer/board-grid.tsx src/pages/designer/board-controls.tsx src/pages/designer/board-parts.test.tsx src/pages/designer/playtest.test.tsx README.md
git commit -m "feat(designer): the last card drawn in the middle of the board, and kept cards on the money line; docs: README"
```
