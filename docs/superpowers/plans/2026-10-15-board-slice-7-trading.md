# Board Games Slice 7 (Trading) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On their own turn, a Rent Day player trades with another player: they pick the player, build an offer of spaces, money and kept cards, and propose it; the other player accepts, which swaps everything at once, or declines; and play goes back to the proposer's turn exactly as it was. All of it is written in Rent Day's own text. To get there, the language gains buttons that pick another player, space picks without "on", phrases about the player who holds a flag (including a "For …," line), phrases that act on every flagged space or card, and a way into a phase that keeps the presser current.

**Architecture:**
- **Language layer only.** New work is in the language (`src/engine/core/lang/`), the views, the designer page and Rent Day's text. Core `game-state.ts`, `flow.ts` and `game-engine.ts` stay untouched. Nothing about trades exists outside `src/games/rent-day.rules` and tests.
- **Built on slice 6's finished state, as its plan describes it** (`docs/superpowers/plans/2026-10-15-board-slice-6-auctions.md`). That includes:
  - game numbers: `GameNumber` (`on: 'game'`, with `start`), the `{gamenumber}` type, values kept in `lang:facts` under `game`, `gameNumber` and `setGameNumber` in `board-state.ts`, `BoardView.gameNumbers` on the bank line;
  - amount buttons: `DeclaredAction.amount`, `Subject.amount`, `PhraseOpts.needsAmount`, `LineCtx.amount`, `amountPrompt`, `amountReady`, `ActionView.amount` and the number box;
  - `lang:interrupted` (`INTERRUPTED_KEY`), its start helper `interruptTurn(state, phase, next)`, the effect `the {phase} phase starts with the player on their left`, and `go back to the interrupted turn` (`resumeTurn`);
  - the skipping turn phrase `the turn passes to the next player on the left who is {playerflag}`;
  - `PhraseOpts.entersPhase`, and `warnUnreachable(phases, elsewhere, library, diagnostics)`;
  - `every player is {playerflag}`, `no player is {playerflag}`, and the effect `no space is {spaceflag}`;
  - `BoardView.interrupted`, which puts the phase's name first in the seat status;
  - in `rent-day.test.ts`, the auto-player's settle-debts step (slice 5) and auction step (slice 6), and slice 6's widened turn invariant;
  - Rent Day's 82 examples. Rent Day's text at the start of this slice is slice 6's final text.
- **The pick rides on the press.**
  - A button whose wording ends in " another player" picks a seat. The move carries it as `player`, and `aboutPress` puts it on `Subject.picked`, never on `env.move`.
  - The move is refused in this order: the flow gate (the engine's), the seat checks, a missing or bad pick, then every `Only if` group.
  - Phrases that read the pick are marked `needsPick`, and the compiler accepts them only where `LineCtx.picked` is set.
- **Space picks without "on".** `actionOf` also reads a trailing " a …" or " an …" part as the button's target when a target phrase reads it. Deciding that needs the game's player flags (`a space the trade partner owns`), so `readActions` moves after the facts are accepted.
- **The player who holds a flag.**
  - `{holder}` is a parameter type ("the player who is proposing", or "the trade partner" for a flag whose name starts with "the"). It resolves to the flag's name.
  - `holderOf(state, seats, flag)` in `board-state.ts` finds the one player still in who holds it.
  - `For {holder}, {effect}` is a compiler frame, `lang:for`, read like `lang:if`. It runs its effect with no move and with the holder as the subject's player, so "they" and "their" both mean the holder.
- **Entering a phase with the presser.** `the {phase} phase starts with them` shares slice 6's start (`interruptTurn` and the phase's start lines) with the presser as the new current seat.
- **Where the new pieces live.**
  - Player picks: new `library/pick-phrases.ts`, `declared-actions.ts`, `board-view.ts`.
  - Space picks without "on": `compile-phase.ts`, `compile.ts`, `library/board-phrases.ts` (the example form).
  - Every, no and some over flags: `library/fact-phrases.ts`. `{zone} are not empty`: `library/flow-phrases.ts`.
  - The holder: `refs.ts`, `board-state.ts`, `compile-util.ts` (the frame), `runtime.ts`, `library/fact-phrases.ts` (the target), `library/game-numbers.ts` (paying and comparing), `library/flow-phrases.ts` (starts with them).
- **Task order follows the breakdown, with two things the code forces.**
  - Task 1 moves `readActions` after the facts are accepted. Task 4's target `a space {holder} owns` only reads once player flags are known, and a button whose target doesn't read is no pick at all.
  - Task 1 changes one existing test. A slice 2 test allows `A player may build a house.` beside `A player may build a house on a street they own.`, and both read "Build a house", which the spec's new label check refuses.

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, Playwright (installed globally; Chromium in `/opt/pw-browsers`) for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-15-board-slice-7-trading-design.md`, including its settled builder-check calls (Q1–Q14). It is part of `docs/superpowers/specs/2026-10-15-board-games-overview-design.md`, and this is its last slice.

## Global Constraints

- **Branch and commands.**
  - Work on `claude/peaceful-curie-rdfkow`.
  - Single test file: `bunx vitest run <path>`.
  - Full suite: `bun run test`. Every test of slice 6's final count passes at the start; run it once first to get the number.
  - Types: `bun run typecheck`.
- **No new dependencies.**
- **Pure core.** `src/engine/core/**` stays pure: no pixi, react or DOM imports, no `Math.random` or `Date.now`.
- **Files not to touch:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, and `src/pages/hearts-demo/**`.
- **Json shapes.**
  - Everything in `CompiledGame` and `SeatExtras`, every `lang:*` value and every move is `Json`.
  - Declare these shapes with `type` aliases, and use `null` (never `undefined`) inside them.
  - `Subject` is not stored anywhere, so its new `picked?: PlayerId` may be optional.
- **No Monopoly words in shared code.**
  - Banned words: rent, house, hotel, street, station, utility, money and jail. They must not appear in engine or language code outside `src/engine/core/lang/library/rent-day.ts`, not even in comments.
  - "chance", "treasury" and "get out of jail free" must not appear in engine, language or page code at all.
  - "mortgage", "mortgaged" and "bankrupt" must not appear in engine, language or page code outside `library/rent-day.ts`, comments included.
  - "auction", "bid", "bidder" and "high bid" must not appear in engine, language or page code at all, `library/rent-day.ts` included, comments included.
    - The one exception is already there: `refs.ts`'s table of irregular participles lists `bid: 'bid'` as plain English. It stays.
  - **"trade", "offer", "propose", "partner", "cash", "handed over", "claimed" and "asked for", in any form ("offered", "proposing", "trades"), must not appear in engine, language or page code, `library/rent-day.ts` included, comments included.** The trade is written in Rent Day's text alone.
    - Some of these are plain English already in the code, and they stay:
      - the example runner's `claim`: `ExampleEnv.claim` in `types.ts`, `claimer` in `examples.ts`, and the cards it has `claimed` in `example-phrases.ts`;
      - four comments: "offered as pickable" in `board-view.ts`, "offering a candidate" in `declared-actions.ts`, "handed over" in `debt-phrases.ts`, and "who was asked for" in `zones.ts`.
    - Add none.
  - All of these words may appear in tests, test fixtures (`lang/testing.ts`), `src/games/*.rules` and docs. The fixtures and test buttons this plan adds use general words anyway (mark, seize, challenge, lend, the rival, leading, lent).
  - These are general words and may appear anywhere: "owe", "give up", "any player", "debt", percentages, "amount", "interrupted turn", "every player", "no player", game numbers, "another player", "that player", "the player who is", "for", "every", "some", "no", "pick" and "holder".
  - No non-test file under `src/pages/designer/` may contain "jail" or "mortgaged". The page shows flags, picks and game numbers by a general rule.
- **No engine words in front of designers.** Diagnostics, rejection reasons, example results and the page never show engine vocabulary (`FlowDef`, `anyActor`, `NamedRef`, `zoneId`, `lang:`) or stack traces.
- **Existing behaviour stays.**
  - Hearts, Color Match and Venom compile with no diagnostics and pass their examples.
  - A button whose wording ends in no target phrase, no " an amount" and no " another player" compiles and plays exactly as before. So does every "on a …" button.
  - Rent Day's 82 examples keep passing unchanged. Its text changes only by adding the trade.
  - One existing test changes, in Task 1: the slice 2 test whose third button `A player may build a house.` shares the label "Build a house" with a pick. The designer-page test's example count changes in Task 5.
  - The seat status keeps slice 6's rule: the phase's name comes first only while a turn is interrupted.
- **Style and commits.**
  - 2-space indent, single quotes, chainable registrars, and comments that say why.
  - Commit prefixes: `feat(lang):`, `feat(games):`, `feat(designer):`, `docs:`.
  - Stage files by path, never `git add -A`.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.

## Review Focus

- **A pick that names no other player still in never reaches a line.** That covers no `player` at all, `null`, `7`, a seat not at the table (`'p9'`), the wrong case (`'P1'`), the presser themselves and a player who is out. Each is refused with "Pick another player to challenge." before any `Only if` line is asked. Test in Task 2.
- **"they" and "their" in a For line are the flag holder, even inside a card move.** A For line runs with no move, so `env.move.by` can't win over the holder. A flag that no player still in holds, or that two do, is an error naming the flag. Test in Task 4.
- **Kept cards cross once.** With kept cards on both sides of one offer, each player ends with the other's card and none comes back, whatever the order of the accept lines. The two cards share a name, so the example proves which is which by using the card received. Test in Task 5.
- **Every way out of a trade leaves nothing behind.** Accept, decline and cancel each leave:
  - no space, card or player with a trade flag (read with `=== true`);
  - both cash numbers at 0;
  - the proposer's turn in the playing phase, with their turn memory as before plus the trade press.
  - Test in Task 5 (the examples for each way out, and the long runs).
- **The picker offers only other players still in.** The presser and a player who is out never appear in it, and pressing a greyed player says why instead of sending. Test in Task 6.

---

### Task 1: Buttons that pick a space without "on"

**Files:**
- Modify: `src/engine/core/lang/compile-phase.ts` (`actionOf`, `compileAction`, `compilePhase`)
- Modify: `src/engine/core/lang/compile.ts` (`readActions` and where it is called)
- Modify: `src/engine/core/lang/types.ts` (the doc comment of `DeclaredAction` only)
- Modify: `src/engine/core/lang/library/board-phrases.ts` (the example form)
- Modify: `src/engine/core/lang/testing.ts` (new `MARK_BOARD`)
- Test: `src/engine/core/lang/compile-phase.test.ts`, `src/engine/core/lang/declared-actions.test.ts`, `src/engine/core/lang/library/board-phrases.test.ts`

**Interfaces:**
- **`compile-phase.ts`:**
  - `actionOf(found: RegExpExecArray, readsTarget: (text: string) => boolean)` returns, beside slice 6's fields (`verb`, `words`, `written`, `base`, `baseWritten`, `target`, `anyone`, `amount`), a new `label: string`. It reads the wording in this order:
    1. A wording that ends in "on a …" or "on an …" (`TARGETED`) picks as before.
    2. Otherwise, the wording is cut before each word "a" or "an" that is not its first word, the leftmost cut first. The first cut whose rest `readsTarget` picks: `base` and `baseWritten` are the words before it, and `target` is the rest as written. So "offer a space they own" has base "offer" and target "a space they own".
    3. Otherwise slice 6's `AMOUNT_WORDING` is tried, as before.
  - `label` is `actionLabel(baseWritten)`. `compileAction` uses it instead of computing its own.
  - `compilePhase` and `compileAction` pass `readsTarget = (text) => canRead('target', text, { ...ctx, player: true })`. A target found this way is then matched by `matchLine('target', …)` as before.
  - A wording that ends in "on any …" or "on one of …" still reaches `otherPick` and is reported, since its trailing part reads no target.
  - `pickBases` now holds only the bases of buttons that pick with "on" (`TARGETED` matches their wording). A pick without "on" that shares a base with another button shares its label too, so the label check reports it.
  - **The label check.** Two buttons in one phase whose labels are the same, lowercased, are reported on the later line with `` `Two buttons in this phase would both read “${label}”; give one of them other words.` ``. The later one is left out, as a repeated wording is.
    - The checks run in this order: same wording (`sameWords`), same pick base (`samePick`), same label, then a verb taken by a card move.
- **`compile.ts`:**
  - `readActions(phases: OutlineNode[], ctx: LineCtx): Vocab['actions']` passes `(text) => canRead('target', text, { ...ctx, player: true })` to `actionOf`, and reports through `ctx.diagnostics`.
  - It is called right after `acceptFacts`, with `stage(vocabFrom({ maxPlayers, zones, cards, phases: phaseIds, verbs, board, facts }))`.
  - `compileCards`' vocab drops `actions`, since no card or declare phrase reads a button. Update the "read ahead" comment to say why the buttons now wait for the facts.
- **`board-phrases.ts`:** action `'{player} {targetaction} {space}'` uses `pressesButtonOn`, next to `'{player} {targetaction} on {space}'`. Both forms read for every button that picks a space.
- **`types.ts`:** `DeclaredAction`'s comment says a button picks a space when its line ends in "on a …", or in a target phrase after its verb ("offer a space they own").
- **`testing.ts`:** new `MARK_BOARD`, written as below.

```ts
/**
 * TINY_BOARD_HEAD with a flag a button sets on a space it picks without “on”: a player may mark a space they own that is not
 * marked yet. Line 15 declares the flag, `A player may mark a space they own.` is line 19 and `A player may end their turn.`
 * line 23.
 */
export const MARK_BOARD = [
  TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Spaces can be marked.'),
  '  A player may mark a space they own.', '    Only if it is not marked.', '    Then:', '      It is marked.',
  '  A player may end their turn.',
  '  After a player ends their turn, the turn passes to the left.',
  '', 'End:', '  The game ends when one player is left.', '  That player wins.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**

In `compile-phase.test.ts`, add `describe('buttons that pick a space without “on”')`. Use `const ending = (button: string) => MARK_BOARD.replace('  A player may end their turn.', `  ${button}\n  A player may end their turn.`)`.

```ts
it('picks with a target phrase after the verb: the words before it are the base and the label', () => {
  const { game, diagnostics } = compileGame(MARK_BOARD, lib);
  expect(diagnostics).toEqual([]);
  expect(game!.phases[0].actions.map((a) => [a.words, a.base, a.label, a.target?.text ?? null])).toEqual([
    ['mark a space they own', 'mark', 'Mark', 'a space they own'], ['end their turn', 'end their turn', 'End your turn', null],
  ]);
});
it('reads a kind of space after the verb as a pick too, and leaves words that read no target a plain button', () => {
  const seize = compileGame(ending('A player may seize a street.'), lib).game!.phases[0].actions[1];
  expect([seize.base, seize.label, seize.target?.text]).toEqual(['seize', 'Seize', 'a street']);
  const pass = compileGame(ending('A player may use a free pass.'), lib).game!.phases[0].actions[1];
  expect([pass.base, pass.label, pass.target]).toEqual(['use a free pass', 'Use a free pass', null]);
});
it('refuses a second button in the phase that would read the same label', () => {
  expect(messages(ending('A player may mark an amount.'))).toEqual([
    [23, 'Two buttons in this phase would both read “Mark”; give one of them other words.'],
  ]);
});
```

Change the existing test `allows buttons that pick a space with different words before “on”, and a button that picks nothing with the same words` in `describe('buttons that pick a target')`:
- Rename it `allows buttons that pick a space with different words before “on”, and refuses a button that picks nothing with the same label`.
- `errorsOf` of its three lines is `[[22, 'Two buttons in this phase would both read “Build a house”; give one of them other words.']]`.
- `phase(...)`'s actions are the first two only.

In `declared-actions.test.ts`, add `describe('buttons that pick a space without “on”')`. Use `const mark = compileGame(MARK_BOARD, lib).game!`, `const MARK = 'mark a space they own'`, and an engine on which p0 owns Mill Lane (1) and p1 owns Rose Lane (3), turn at p0 in playing:
- `{ type: MARK, by: 'p0', target: 1 }` is accepted, and `spaceFact(…, 1, 'marked')` is then `true`.
- With `target: 3`, `canDispatch` gives `"That isn't a space you own."`.
- With no target, it gives `'Pick where to mark.'`.
- After marking Mill Lane, marking it again gives `'it is not marked'`.
- **As an example.** In the test, compile `MARK_BOARD` with the example below appended. It has no diagnostics, and `runExamples` gives one result, which passes.

```text
Example: marking a space
  Given p0 owns Mill Lane
  And p1 owns Rose Lane
  When p0 marks Rose Lane
  Then it is rejected because "That isn't a space you own."
  When p0 marks Mill Lane
  Then it is accepted
  And Mill Lane is marked
  When p0 marks Mill Lane
  Then it is rejected because "it is not marked"
```

In `library/board-phrases.test.ts`, with `vocabFor(compileGame(MARK_BOARD, lib).game!)`:
- `lib.match('action', 'p0 marks Mill Lane', vocab)` is ok with args `['p0', 'mark a space they own', 1]`, and running it gives `{ by: 'p0', move: { type: 'mark a space they own', target: 1 } }`.
- `'p0 marks on Mill Lane'` still matches, with the same args.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/library/board-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the three files and `bunx vitest run src/games`, then `bun run test` and `bun run typecheck`. Only the one test named above changes. If another existing test fails because a plain button now picks or shares a label, stop and report it rather than changing it.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/compile-phase.ts src/engine/core/lang/compile.ts src/engine/core/lang/types.ts \
  src/engine/core/lang/library/board-phrases.ts src/engine/core/lang/testing.ts src/engine/core/lang/compile-phase.test.ts \
  src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/library/board-phrases.test.ts
git commit -m "feat(lang): buttons that pick a space with a target phrase after the verb, and no two buttons in a phase with one label"
```

---

### Task 2: Buttons that pick another player

**Files:**
- Modify: `src/engine/core/lang/types.ts` (`DeclaredAction.picksPlayer`, `Vocab['actions'][number].picksPlayer`, `Subject.picked`)
- Modify: `src/engine/core/lang/phrases.ts` (`PhraseOpts.needsPick`, `Entry`, `add`, `get`)
- Modify: `src/engine/core/lang/compile-util.ts` (`LineCtx.picked`, `unmetNeed`)
- Modify: `src/engine/core/lang/compile-phase.ts` (`PLAYER_WORDING`, `actionOf`, `compileAction`)
- Modify: `src/engine/core/lang/compile.ts` (`readActions`, and `picked: false` in `stage`)
- Modify: `src/engine/core/lang/refs.ts` (`PICKACTION`)
- Modify: `src/engine/core/lang/declared-actions.ts` (`pickedPlayer`, `pickPlayerPrompt`, `playerCandidates`, `aboutPress`, `calledBy`)
- Modify: `src/engine/core/lang/board-view.ts` (`ActionView.players`, `allowedNow`, `actionViews`, `isAction`)
- Modify: `src/engine/core/lang/library/support.ts` (`thePick`)
- Create: `src/engine/core/lang/library/pick-phrases.ts` (`registerPickPhrases`, added to `REGISTRARS` right after `registerAmountPhrases`)
- Modify: `src/engine/core/lang/testing.ts` (`vocabFor`, new `PICK_BOARD`)
- Modify: tests that build a vocab action, a `DeclaredAction`, an `ActionView` or a `LineCtx` by hand, or compare compiled actions or action views whole. Each gains `picksPlayer: false`, `players: null` or `picked: false`. To find them, grep `amount: false` in tests. They include `refs.test.ts`, `phrases.test.ts`, `library/board-phrases.test.ts`, `compile-phase.test.ts`, `compile-util.test.ts`, `board-view.test.ts` and `src/pages/designer/board-parts.test.tsx`.
- Test: create `src/engine/core/lang/library/pick-phrases.test.ts`; `declared-actions.test.ts`, `compile-phase.test.ts`, `board-view.test.ts`

**Interfaces:**
- Consumes `actionOf`'s `readsTarget` and `label` (Task 1).
- **`types.ts`:**
  - `DeclaredAction.picksPlayer: boolean` is true for a button whose wording ends in " another player" and that picks no space and carries no amount.
    - Its `base` leaves " another player" out: `trade with another player` has base `'trade with'`.
    - Its `label` is the whole wording in the second person ("Challenge another player"). The page shows the players to pick only after the press, so the button says what it does.
    - Its `words`, which are its move type, keep the whole wording.
  - `Vocab['actions'][number]` gains `picksPlayer: boolean`.
  - `Subject` gains `picked?: PlayerId`: the player the press picked, set only for a button that picks one.
- **`phrases.ts`:** `PhraseOpts.needsPick?: boolean`: the phrase reads the player a button's press picked. `get` returns it with the other needs.
- **`compile-util.ts`:**
  - `LineCtx.picked: boolean` is true only for the lines of a button that picks another player.
  - `unmetNeed`, after slice 6's amount check: `` `“${clean}” only makes sense in a button whose wording ends in “another player”, like “A player may challenge another player.”` ``.
- **`compile-phase.ts`:**
  - `PLAYER_WORDING = /^(.+) another player$/i` is tried last in `actionOf`, on a wording that picks no space and carries no amount.
  - `actionOf` also returns `picksPlayer: boolean`. For a pick button, `base` and `baseWritten` are group 1, and `label` is `actionLabel(written)`.
  - `compileAction` reads the body with `{ ...ctx, player: true, space: true, amount, picked: picksPlayer }`, and copies `picksPlayer` into the `DeclaredAction`.
- **`compile.ts`:** `readActions` passes `picksPlayer`. `stage` sets `picked: false`.
- **`refs.ts`:** `PICKACTION = wordType('pickaction', '[action]', (v) => v.actions.filter((a) => a.picksPlayer).map((a) => [thirdPersonWords(a.base), a.words]), undefined)`. It is added to `VOCAB_TYPES`. `ACTION` still lists pick buttons by their whole wording, so "p0 trades with another player" sends no pick.
- **`declared-actions.ts`:**
  - `pickedPlayer(m: Move, runtime: LangRuntime, state: GameState, by: PlayerId): PlayerId | null` (file-private) gives `m.player` when it is text, one of `runtime.seats`, not `by`, and not out. Otherwise it gives null.
  - `export function pickPlayerPrompt(action: DeclaredAction): string` is `` `Pick another player to ${secondPersonWords(action.base)}.` ``
  - `aboutPress`, for a pick button: a null `pickedPlayer` gives `pickPlayerPrompt(action)`. Otherwise it gives `{ player: by, space: null, card: null, picked }`.
  - So `choose` refuses in this order: no such button or seat, out of the game, the pick, then the first failing group. The flow gate comes before all of them.
  - `calledBy` names a pick button by its whole wording ("You can't challenge another player now."), since its base alone reads wrong.
  - `export function playerCandidates(runtime: LangRuntime, state: GameState, seat: PlayerId): PlayerId[]` gives every seat still in but `seat`, in seat order.
- **`board-view.ts`:**
  - `ActionView` gains `players: { [seat: string]: true | string } | null`. For a pick button it has each of `playerCandidates`, `true` when the move accepts it and otherwise the sentence for why not. It is null for every other button.
  - `allowedNow(engine, state, seat, move, pick: { target?: number; player?: PlayerId } = {})` replaces its `target?: number` parameter and adds the pick's field to the move.
  - For a pick button, `allowed` is:
    - `OUT_OF_GAME` for a seat that is out, with `players: {}`;
    - once the game is over, `friendlyReason('game is over')`;
    - `true` when any candidate's verdict is `true`, else the first verdict;
    - with no candidates, `allowedNow` with no player.
  - `isAction` requires `players` to be null or a map of verdicts.
- **`support.ts`:** `thePick(env: PhraseEnv): PlayerId` gives `env.subject.picked`. Without one, it throws `Error` `This phrase needs a player picked, but the button carries none.`
- **`pick-phrases.ts`** (say "pick" and "player", never the banned words):
  - Effect `'that player is {playerflag}'` (needsPick) is `setPlayerFact(env.state, thePick(env), flag, true)`.
  - Action `'{player} {pickaction} {player}'` gives `{ by, move: { type: words, player: picked } }`. The picked seat goes on the move as written: the button, not the example, refuses a seat that is no one to pick.
- **`testing.ts`:**
  - `vocabFor` passes `picksPlayer: a.picksPlayer`.
  - New `PICK_BOARD`, written as below.

```ts
/**
 * TINY_BOARD_HEAD with a button that picks another player: after rolling, a player may challenge another player, who becomes
 * the rival. Line 15 declares the rival, `A player may challenge another player.` is line 24 and `A player may end their turn.`
 * line 28.
 */
export const PICK_BOARD = [
  TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Players can be the rival.'),
  '  A player may roll the dice.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.',
  '      Their piece moves forward by the roll.',
  '  A player may challenge another player.', '    Only if they have rolled this turn.', '    Then:', '      That player is the rival.',
  '  A player may end their turn.', '    Only if they have rolled this turn.',
  '  After a player ends their turn, the turn passes to the left.',
  '', 'End:', '  The game ends when one player is left.', '  That player wins.',
].join('\n');
```

- [ ] **Step 1: Write the failing tests.**

In `declared-actions.test.ts`, add `describe('buttons that pick another player', …)`. Use `const pick = compileGame(PICK_BOARD, lib).game!`, `const CHALLENGE = 'challenge another player'`, and `table(players, arrange)`: a `createEngine(pick, lib, players, …)` engine whose turn is at p0 in playing, after `arrange`.

```ts
it('compiles, keeps “another player” out of the base, and reads the pick from the move', () => {
  expect(compileGame(PICK_BOARD, lib).diagnostics).toEqual([]);
  expect(pick.phases[0].actions[1]).toMatchObject({ words: CHALLENGE, base: 'challenge', label: 'Challenge another player', picksPlayer: true, target: null, amount: false });
  const engine = table(2, (s) => queueRoll(s, [1, 2]));
  engine.dispatch({ type: 'roll the dice', by: 'p0' });
  expect(engine.dispatch({ type: CHALLENGE, by: 'p0', player: 'p1' }).ok).toBe(true);
  expect(playerFact(engine.getState(), 'p1', 'the rival')).toBe(true);
});
it('refuses in order: the turn, the pick, then every Only if line', () => {
  const engine = table(2, (s) => s);
  expect(engine.canDispatch({ type: CHALLENGE, by: 'p1', player: 'p0' })).toBe("not p1's turn");
  expect(engine.canDispatch({ type: CHALLENGE, by: 'p0' })).toBe('Pick another player to challenge.');
  expect(engine.canDispatch({ type: CHALLENGE, by: 'p0', player: 'p1' })).toBe('they have rolled this turn');
});
it('Review Focus: a pick that names no other player still in is refused before any Only if line is asked', () => {
  const engine = table(3, (s) => markOut(s, 'p2'));
  for (const player of [null, 7, 'p9', 'P1', 'p0', 'p2']) {
    expect(engine.canDispatch({ type: CHALLENGE, by: 'p0', player }), String(player)).toBe('Pick another player to challenge.');
  }
  expect(engine.canDispatch({ type: CHALLENGE, by: 'p0' })).toBe('Pick another player to challenge.');
});
```

Also add this to the same describe: **As an example.** In the test, compile `PICK_BOARD` with the example below appended. It has no diagnostics, and `runExamples` gives one result, which passes. The roll lands on Rose Lane (3), where no rule fires.

```text
Example: challenging
  Given the next roll is 1 and 2
  When p0 rolls the dice
  And p0 challenges p0
  Then it is rejected because "Pick another player to challenge."
  When p0 challenges another player
  Then it is rejected because "Pick another player to challenge."
  When p0 challenges p1
  Then it is accepted
  And p1 is the rival
```

In `compile-phase.test.ts`, add `describe('buttons that pick another player', …)`:
- **"that player" outside a pick button.** `PICK_BOARD.replace('  A player may end their turn.\n    Only if they have rolled this turn.', '  A player may end their turn.\n    Only if they have rolled this turn.\n    Then:\n      That player is the rival.')` gives diagnostics containing:
  - `[31, '“That player is the rival” only makes sense in a button whose wording ends in “another player”, like “A player may challenge another player.”']`.
- **Only at the end.** `PICK_BOARD.replace('  A player may end their turn.', '  A player may challenge another player twice.\n  A player may end their turn.')` compiles with no errors. The new button is a plain one: `picksPlayer: false`, its base equal to its words, and its label `Challenge another player twice`.

Create `library/pick-phrases.test.ts`. Use the compiled `PICK_BOARD` game, and `about(state, picked)`: the env of a rule about p0 whose subject carries `picked`.
- **Setting.** `that player is the rival` with `picked: 'p1'` sets p1's `the rival` and no one else's.
- **No pick.** Without `picked` it throws `This phrase needs a player picked, but the button carries none.`
- **Needs.** `lib.get('effect', 'that player is {playerflag}')` matches `{ needsPick: true }`.
- **The example action.**
  - `lib.match('action', 'p0 challenges p1', vocabFor(pick))` is ok with args `['p0', 'challenge another player', 'p1']`. Running it gives `{ by: 'p0', move: { type: 'challenge another player', player: 'p1' } }`.
  - `'p0 challenges another player'` matches `{player} {action}`, and running it gives a move with no `player`.

In `board-view.test.ts`, add `describe('seat views of a button that picks another player')`, on a three-player `PICK_BOARD` engine with `[1, 2]` queued. `view(engine, seat)` is the seat's challenge `ActionView`.
- **Before rolling.** p0's view is `{ move: CHALLENGE, label: 'Challenge another player', allowed: 'they have rolled this turn', target: null, amount: false, players: { p1: 'they have rolled this turn', p2: 'they have rolled this turn' } }`.
- **After p0 rolls.**
  - p0's `players` is `{ p1: true, p2: true }` and its `allowed` is `true`.
  - p1's view has `allowed: "It's p0's turn."` and `players: { p0: "It's p0's turn.", p2: "It's p0's turn." }`.
- **Out.** With p2 out, p0's `players` has only `p1`. p2's own view has `allowed: "You're out of the game."` and `players: {}`.
- **Other buttons.** Roll and end their turn have `players: null`.
- **Plain data.** `readSeatExtras` gives null for an action without `players`, and for `players: { p1: 3 }`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/declared-actions.test.ts src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/library/pick-phrases.test.ts src/engine/core/lang/board-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the four files and `bunx vitest run src/pages/designer`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/types.ts src/engine/core/lang/phrases.ts src/engine/core/lang/compile-util.ts src/engine/core/lang/compile-phase.ts \
  src/engine/core/lang/compile.ts src/engine/core/lang/refs.ts src/engine/core/lang/declared-actions.ts src/engine/core/lang/board-view.ts \
  src/engine/core/lang/library/support.ts src/engine/core/lang/library/pick-phrases.ts src/engine/core/lang/library/index.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/library/pick-phrases.test.ts src/engine/core/lang/declared-actions.test.ts \
  src/engine/core/lang/compile-phase.test.ts src/engine/core/lang/compile-util.test.ts src/engine/core/lang/board-view.test.ts \
  src/engine/core/lang/refs.test.ts src/engine/core/lang/phrases.test.ts src/engine/core/lang/library/board-phrases.test.ts \
  src/pages/designer/board-parts.test.tsx
# If the full run or typecheck needed `picksPlayer: false`, `players: null` or `picked: false` in another test file, stage it by path too.
git commit -m "feat(lang): buttons that pick another player, refused when the pick is no other player still in, with the players to pick in the seat view"
```

---

### Task 3: Every, no and some, over the flags of spaces and cards

**Files:**
- Modify: `src/engine/core/lang/library/fact-phrases.ts`
- Modify: `src/engine/core/lang/library/flow-phrases.ts` (`{zone} are not empty`)
- Test: `src/engine/core/lang/library/fact-phrases.test.ts`, `src/engine/core/lang/library/flow-phrases.test.ts`

**Interfaces:**
- **`fact-phrases.ts`.** A flag is set when it reads `=== true`: a card's in its `data` (`cardFact`), a space's in `lang:facts`.
  - Effect `'they own every space that is {spaceflag}'` (needsPlayer, needsBoard) gives every space with the flag set to them, with `setOwner`. Its facts stay as they are.
  - Condition `'some space is {spaceflag}'` (needsBoard) holds when any space has the flag set.
  - Effect `'no card is {cardflag}'` deletes the flag from every card that has it, set or not, with `changeCard(…, { [flag]: null }, game)`. A card's face goes back to how it was.
  - Effect `'every card that is {cardflag} goes to {zone}'` relocates every card with the flag set, in `state.cards` order, to `soleZone(zone, env)`. Its data goes with it, the flag included. With none flagged, it gives the state as it is.
  - Condition `'some card is {cardflag}'` holds when any card has the flag set.
  - Already there, and used as they are: `every card in {zone} is {cardflag}`, and slice 6's `no space is {spaceflag}`.
- **`flow-phrases.ts`:** condition `'{zone} are not empty'` is `{zone} is not empty` for a zone named in the plural ("their kept cards are not empty").

- [ ] **Step 1: Write the failing tests.**

In `fact-phrases.test.ts`, add `describe('every space with a flag, and whether some space has it')` on slice 5's `FLAGGED` game (Mill Lane 1, Rose Lane 5, Lily Lane 8), with `const flagged = (...spaces: number[]) => spaces.reduce((s, at) => setSpaceFact(s, at, 'mortgaged', true), fresh(FLAGGED))`:

```ts
it('gives them every space with the flag set, flag and all, and no other', () => {
  const s = effect('they own every space that is mortgaged', setOwner(flagged(1, LILY), LILY, 'p1'), null, FLAGGED);
  expect([1, ROSE, LILY].map((at) => ownerOf(s, at))).toEqual(['p0', null, 'p0']);
  expect([1, LILY].map((at) => spaceFact(s, at, 'mortgaged'))).toEqual([true, true]);
});
it('judges whether some space has the flag set', () => {
  const some = (state: GameState) => runPhrase<boolean>(lib, 'condition', 'some space is mortgaged', bare(state, FLAGGED));
  expect(some(fresh(FLAGGED))).toBe(false);
  expect(some(flagged(ROSE))).toBe(true);
  expect(some(setSpaceFact(flagged(ROSE), ROSE, 'mortgaged', false))).toBe(false);
});
```

Also add: **Needs.** `they own every space that is {spaceflag}` matches `{ needsPlayer: true, needsBoard: true }`, and `some space is {spaceflag}` matches `{ needsBoard: true }`.

In the same file's `describe('facts on cards')`, add `describe('every card with a flag, no card with it, and some card with it')`. On the `creatures` table, c1, c3 and c4 are poisoned.

```ts
it('moves every flagged card to the zone in the order the table holds them, and the flag goes with it', () => {
  const s = effectAs('every card that is poisoned goes to their camp', byPlayer('p0'));
  expect(zoneCards(s, 'camp-p0').map((c) => c.id)).toEqual(['c0', 'c6', 'c1', 'c3', 'c4']);
  expect(zoneCards(s, 'camp-p1').map((c) => c.id)).toEqual(['c2', 'c5']);
  expect(['c1', 'c3', 'c4'].map((id) => cardFact(cardOf(s, id), 'poisoned'))).toEqual([true, true, true]);
});
it('takes the flag off every card, so each face is as it was', () => {
  const s = runPhrase<GameState>(lib, 'effect', 'no card is poisoned', bare(table()));
  expect(s.cards.filter((c) => Object.hasOwn(c.data ?? {}, 'poisoned'))).toEqual([]);
  expect(cardOf(s, 'c1').faceKey).toBe(faceOf('Archer', 2));
  expect(effectAs('every card that is poisoned goes to their camp', byPlayer('p0'), s)).toEqual(s);
});
it('judges whether some card has the flag set', () => {
  expect(runPhrase<boolean>(lib, 'condition', 'some card is poisoned', bare(table()))).toBe(true);
  const none = runPhrase<GameState>(lib, 'effect', 'no card is poisoned', bare(table()));
  expect(runPhrase<boolean>(lib, 'condition', 'some card is poisoned', bare(none))).toBe(false);
});
```

In `flow-phrases.test.ts`, next to the `is empty / is not empty` tests, add **a zone named in the plural**:
- Use `fixtureGame` with a public `kept cards` row added to its zones, and one card in p1's.
- `their kept cards are not empty` is true about p1 and false about p0.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/library/fact-phrases.test.ts src/engine/core/lang/library/flow-phrases.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the two files, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/fact-phrases.ts src/engine/core/lang/library/flow-phrases.ts \
  src/engine/core/lang/library/fact-phrases.test.ts src/engine/core/lang/library/flow-phrases.test.ts
git commit -m "feat(lang): every, no and some over the flags of spaces and cards, flagged cards moving flag and all, and zones that are not empty"
```

---

### Task 4: The player who holds a flag

**Files:**
- Modify: `src/engine/core/lang/refs.ts` (`HOLDER`)
- Modify: `src/engine/core/lang/board-state.ts` (`holderOf`)
- Modify: `src/engine/core/lang/compile-util.ts` (`FOR_FRAME` in `matchEffectLine`, `innerEffect`)
- Modify: `src/engine/core/lang/runtime.ts` (`run`)
- Modify: `src/engine/core/lang/compile.ts` (`warnUnreachable` reads effects through `innerEffect`)
- Modify: `src/engine/core/lang/library/board-phrases.ts` (`rollsTheDice` reads through `innerEffect`)
- Modify: `src/engine/core/lang/library/fact-phrases.ts` (target)
- Modify: `src/engine/core/lang/library/game-numbers.ts` (three phrases)
- Modify: `src/engine/core/lang/library/flow-phrases.ts` (starts with them, sharing slice 6's start)
- Modify: `src/engine/core/lang/testing.ts` (new `HOLDING_BOARD`)
- Test: `src/engine/core/lang/refs.test.ts`, `src/engine/core/lang/board-state.test.ts`, `src/engine/core/lang/compile-util.test.ts`, `src/engine/core/lang/runtime.test.ts`, `src/engine/core/lang/compile.test.ts`, `src/engine/core/lang/library/board-phrases.test.ts`, `src/engine/core/lang/library/fact-phrases.test.ts`, `src/engine/core/lang/library/game-numbers.test.ts`, `src/engine/core/lang/library/flow-phrases.test.ts`

**Interfaces:**
- Consumes space picks without "on" (Task 1), `PICK_BOARD` (Task 2), slice 6's `gameNumber`, `transfer` and `interruptTurn`.
- **`refs.ts`:** `HOLDER = wordType('holder', '[the player who is …]', entries, undefined)`. It is added to `VOCAB_TYPES`.
  - `entries` has, for every player flag `f` the game declares, `[`the player who is ${f}`, f]`, and also `[f, f]` when `f` starts with "the ".
  - So "the player who is proposing" and "the trade partner" both resolve to their flag's name. A flag that does not start with "the" ("leading") is no holder on its own.
- **`board-state.ts`:** `holderOf(state: GameState, seats: PlayerId[], flag: string): PlayerId` gives the one player still in (`playersIn`) whose flag reads `true`. Its errors are:
  - with none, RuleError `` `No player is ${flag}.` ``;
  - with more than one, RuleError `` `More than one player is ${flag}: ${seats}.` ``, the seats in seat order, joined like "p0, p1 and p2".
- **`compile-util.ts`:**
  - `FOR_FRAME = /^for\s+(.+)$/i` is tried in `matchEffectLine` before `IF_FRAME`. The body is cut at each ", ", left to right. The first cut whose head `parseParam('holder', head, ctx.vocab)` resolves wins.
  - Its effect is read with `matchLine('effect', rest, line, { ...ctx, player: true, inMove: false })`. The result is `{ kind: 'lang', phrase: 'for', args: [flag, effect], line, text: clean }`.
  - `inMove: false` because the effect runs with no move: a phrase that needs a card move is reported in a For line.
  - With no such cut, it reports `` `“${head}” doesn't name a player. Write “For the player who is …,” with something players can be.` `` (kind `invalid`, `head` being the text before the first ", ", or all of it) and returns `missingRef('effect', clean, line)`.
  - `export function innerEffect(ref: PhraseRef): PhraseRef` gives the effect of an `if` or `for` ref (`args[1]`), else the ref itself.
- **`runtime.ts`:**
  - `run` of a `lang:for` ref finds `holderOf(state, this.seats, flag)`. A throw there comes out as `located(error, ref)`, a RuleError with the For line's line and text.
  - It then runs the effect with `move` undefined, the same `example`, and the subject `{ ...(subject ?? { player: null, space: null, card: null }), player: holder }`. The space, amount and pick of the press stay.
- **`compile.ts`:** `warnUnreachable` reads every effect it scans through `innerEffect`, so a For line counts as an If line does.
- **`board-phrases.ts`:** `rollsTheDice` reads its line through `innerEffect`.
- **`fact-phrases.ts`:** target `'a space {holder} owns'` (needsBoard) allows a space whose owner is `holderOf(env.state, env.seats, flag)`.
- **`game-numbers.ts`:**
  - Effect `'they pay the {gamenumber} to {holder}'` (needsPlayer, needsPayment) is `transfer(env, theyOf(env), holderOf(…), gameNumber(…))`, so slice 5's debt record applies to it.
  - Condition `'the {gamenumber} is more than {int}'`.
  - Condition `'they have at least the {gamenumber} in {counter}'` (needsPlayer).
- **`flow-phrases.ts`:**
  - Slice 6's start effect does two things: `interruptTurn`, then the phase's start lines through `env.runLine`. Move them into one file-private `startPhase(env: PhraseEnv, phase: string, next: PlayerId): GameState`, and have that effect call it with `nextIn(…)`.
  - Effect `'the {phase} phase starts with them'` (needsPlayer, entersPhase) is `startPhase(env, phase, theyOf(env))`. The presser stays current, and the snapshot already holds the press.
- **`testing.ts`:** new `HOLDING_BOARD`, written as below. Task 6 uses it too.

```ts
/**
 * deckGameText with a lucky card players keep (Pass), a flag cards can have (lent), and two flags players can have (leading, the
 * rival). Its one new button runs two lines about the players who hold them: lending flags every card the leader keeps, and the
 * rival gets 5 money.
 */
export const HOLDING_BOARD = deckGameText(
  ['| name | says |', '| Pass | They keep this card in their kept cards. |'], ['| name | says |', '| Calm | They get 0 money. |'],
  [
    '  A player may lend.', '    Then:',
    '      For the player who is leading, every card in their kept cards is lent.', '      For the rival, they get 5 money.',
  ],
).replace('  The bank has 32 houses and 12 hotels.', '  The bank has 32 houses and 12 hotels.\n  Cards can be lent.\n  Players can be leading.\n  Players can be the rival.');
```

- [ ] **Step 1: Write the failing tests.**

In `board-state.test.ts`, with `seats = ['p0', 'p1', 'p2']`, `fresh = fixtureBoardState(undefined, seats)` and `leading(state, ...who)` setting `leading` on each:

```ts
describe('the player who holds a flag', () => {
  it('is the one player still in with the flag set', () => {
    expect(holderOf(leading(fresh, 'p1'), seats, 'leading')).toBe('p1');
    expect(holderOf(markOut(leading(fresh, 'p1', 'p2'), 'p2'), seats, 'leading')).toBe('p1');
  });
  it('Review Focus: is an error naming the flag when no player still in has it, or more than one does', () => {
    expect(() => holderOf(fresh, seats, 'leading')).toThrow(new RuleError('No player is leading.'));
    expect(() => holderOf(markOut(leading(fresh, 'p2'), 'p2'), seats, 'leading')).toThrow('No player is leading.');
    expect(() => holderOf(setPlayerFact(fresh, 'p1', 'leading', false), seats, 'leading')).toThrow('No player is leading.');
    expect(() => holderOf(leading(fresh, 'p0', 'p1', 'p2'), seats, 'leading')).toThrow('More than one player is leading: p0, p1 and p2.');
  });
});
```

In `refs.test.ts`, with `vocabFrom({ maxPlayers: 4, facts: [leading, the rival] })` (both player flags):
- `parseParam('holder', …)` gives `{ value: 'leading' }` for "the player who is leading".
- It gives `{ value: 'the rival' }` for "the player who is the rival", "the rival" and "The Rival".
- It gives null for "leading" and for "the player who is asleep".

In `runtime.test.ts`, add `describe('a line about the player who holds a flag')` on `HOLDING_BOARD`. `pass` is the id of its Pass card, and every engine starts at p0's turn in playing with three players.
- **Compiled.** `compileGame(HOLDING_BOARD, lib).diagnostics` is `[]`. The lend button's second effect matches `{ kind: 'lang', phrase: 'for', args: ['the rival', { kind: 'effect', phrase: 'they get {int} {counter}', args: [5, 'money'] }] }`.
- **Run as the holder.** p1 is leading and keeps the Pass, and p2 is the rival. After p0 presses lend:
  - the Pass is lent;
  - money is p0 1500, p1 1500, p2 1505.
- **Review Focus: inside a card move.** Call `runtime.run(firstLine, state, move, undefined, { player: 'p0', space: null, card: null })` with `move` a `MoveInfo` by p0. p1 is leading and keeps the Pass, and p0 keeps the Calm card. Then the Pass is lent and the Calm card is not.
- **Review Focus: no holder, or two.**
  - With nobody leading, pressing lend throws `` `No player is leading.` ``. The error is a RuleError whose `line` is the For line's.
  - With p1 and p2 both leading, it throws `More than one player is leading: p1 and p2.`
  - With p1 leading but out, and p2 leading, the Pass in p2's kept cards is lent.

In `compile.test.ts`, add `describe('lines about the player who holds a flag')`. `at(text, line)` is the 1-based number of the line in the text.
- **A misnamed holder.** `HOLDING_BOARD.replace('For the rival,', 'For the rivel,')` gives `[[at(…, '      For the rivel, they get 5 money.'), '“the rivel” doesn\'t name a player. Write “For the player who is …,” with something players can be.']]` among its messages.
- **An unknown effect.** `HOLDING_BOARD.replace('they get 5 money', 'they dance')` reports `“they dance” isn't in the phrase library yet.` on that line.
- **Phases a line starts** (slice 6's describe, on its `INTERRUPT_BOARD`). Replace `'      The vote phase starts with the player on their left.'` with each of these:
  - `'      The vote phase starts with them.'`;
  - `'      If they have rolled this turn, the vote phase starts with them.'`;
  - `'      For the player who is voting, the vote phase starts with them.'`.
  - Each compiles with no diagnostics. With the start line replaced by `'      They get 5 money.'` and the For line added as the last line of `close the vote`'s `Then:`, `messages` is `[[32, 'Nothing leads to the phase “vote”.']]`.

In `compile-util.test.ts`, add **the effect a line runs**. `innerEffect` gives:
- the effect itself for an effect ref;
- `args[1]` for an `if` ref and for a `for` ref.

In `library/board-phrases.test.ts`, add **rolls through a For line**:
- Compile `TINY_BOARD` with `      Roll the dice.` replaced by `      For the player who is leading, roll the dice.`, and `  Players can be leading.` added after the dice line.
- The Given `p0 has rolled 1 double this turn` notes `roll the dice` in p0's turn log.

In `library/fact-phrases.test.ts`, add `describe('a space the player who holds a flag owns')` on the compiled `PICK_BOARD`, with three seats, p0 owning Mill Lane (1) and p1 owning Rose Lane (3):
- With p1 the rival, the target `a space the rival owns` allows 3 and not 1, and so does `a space the player who is the rival owns`.
- With nobody the rival, it throws `No player is the rival.`
- **A pick without "on".** Compile `PICK_BOARD.replace('  A player may end their turn.', '  A player may seize a space the rival owns.\n    Then:\n      They own it.\n  A player may end their turn.')` with the example below appended. It has no diagnostics, and its one example passes.

```text
Example: seizing a space of the rival
  Given p1 is the rival
  And p1 owns Rose Lane
  And p0 owns Mill Lane
  When p0 seizes Mill Lane
  Then it is rejected because "That isn't a space the rival owns."
  When p0 seizes Rose Lane
  Then it is accepted
  And p0 owns Rose Lane
```

In `library/game-numbers.test.ts`, add `describe('a number of the game and the player who holds a flag')`. Use `HELD = POT.replace('  The game has a pot of 5.', '  The game has a pot of 5.\n  Players can be leading.\n  Players can be the rival.')` and rules about p0 with p1 the rival.
- **Paying.** `they pay the pot to the rival` leaves p0 at 1495 and p1 at 1505. `they pay the pot to the player who is the rival` gives the same state.
- **A debt.** With p0 at 3 money, p0 ends at -2 and `owedTo(…, 'p0', 'money')` is `'p1'`.
- **Comparing.**
  - `the pot is more than 4` is true and `the pot is more than 5` false.
  - `they have at least the pot in money` is true at 5 money and false at 4.
- **Needs.**
  - The payment matches `{ needsPlayer: true, needsPayment: true }`.
  - `they have at least the {gamenumber} in {counter}` matches `{ needsPlayer: true }`.

In `library/flow-phrases.test.ts`, in slice 6's `describe('a phase that interrupts the turn')`, give the `voting` helper an optional game, and use `WITH_THEM = compileGame(INTERRUPT_BOARD.replace('      The vote phase starts with the player on their left.', '      The vote phase starts with them.'), lib).game!`:

```ts
it('starts with the player who pressed, runs its start lines, and goes back to their turn as it was', () => {
  const engine = voting(3, (s) => queueRoll(s, [1, 2]), WITH_THEM);
  press(engine, 'roll the dice', 'p0');
  press(engine, 'call a vote', 'p0');
  let s = engine.getState();
  expect(s.turn).toEqual({ current: 'p0', phase: 'vote' });
  expect(['p0', 'p1', 'p2'].map((seat) => playerFact(s, seat, 'voting'))).toEqual([true, true, true]);
  expect(interruptedTurn(s)).toEqual({ phase: 'playing', current: 'p0', log: { p0: ['roll the dice', 'call a vote'] }, rolls: { p0: [[1, 2]] } });
  for (const seat of ['p0', 'p1', 'p2']) press(engine, 'abstain', seat);
  s = engine.getState();
  expect(s.turn).toEqual({ current: 'p0', phase: 'playing' });
  expect(s.data[TURN_KEY]).toEqual({ p0: ['roll the dice', 'call a vote'] });
  expect(engine.canDispatch({ type: 'end their turn', by: 'p0' })).toBe(true);
});
```

Also add: **Needs.** `lib.get('effect', 'the {phase} phase starts with them')` matches `{ needsPlayer: true, entersPhase: true }`.

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/refs.test.ts src/engine/core/lang/board-state.test.ts src/engine/core/lang/compile-util.test.ts src/engine/core/lang/runtime.test.ts src/engine/core/lang/compile.test.ts src/engine/core/lang/library`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** the same files, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/refs.ts src/engine/core/lang/board-state.ts src/engine/core/lang/compile-util.ts src/engine/core/lang/runtime.ts \
  src/engine/core/lang/compile.ts src/engine/core/lang/library/board-phrases.ts src/engine/core/lang/library/fact-phrases.ts \
  src/engine/core/lang/library/game-numbers.ts src/engine/core/lang/library/flow-phrases.ts src/engine/core/lang/testing.ts \
  src/engine/core/lang/refs.test.ts src/engine/core/lang/board-state.test.ts src/engine/core/lang/compile-util.test.ts \
  src/engine/core/lang/runtime.test.ts src/engine/core/lang/compile.test.ts src/engine/core/lang/library/board-phrases.test.ts \
  src/engine/core/lang/library/fact-phrases.test.ts src/engine/core/lang/library/game-numbers.test.ts src/engine/core/lang/library/flow-phrases.test.ts
git commit -m "feat(lang): the player who holds a flag: paid, owning a space to pick, and a For line run as them; and a phase that starts with the player who pressed"
```

---

### Task 5: Rent Day, slice 7

**Files:**
- Modify: `src/games/rent-day.rules`
- Modify: `src/games/rent-day.test.ts`
- Modify: `src/pages/designer/designer-page.test.tsx` (the example count)

**Interfaces:**
- Consumes every phrase above, `gameNumber`, `nextIn`, and slices 5 and 6's auto-player (`make`, the settle-debts step, the auction step, `debtors`, `accepted`, `colorsInBoardOrder`, slice 6's `open` record and widened turn check).
- **New move types and labels.** No two labels in a phase are the same.
  - In playing: `'trade with another player'`, labelled `Trade with another player`, which picks a player.
  - In trade:
    - `'offer a space they own'` (`Offer`) and `'ask for a space the trade partner owns'` (`Ask for`), which pick a space;
    - `'offer to pay an amount'` (`Offer to pay`) and `'ask to be paid an amount'` (`Ask to be paid`), which carry an amount;
    - `'offer everything they keep'` (`Offer everything you keep`) and `'ask for everything the trade partner keeps'` (`Ask for everything the trade partner keeps`);
    - `'propose the trade'`, `'cancel the trade'`, `'accept the trade'` and `'decline the trade'`.
- **Board numbers:**
  - Go 0, Mill Lane 1 and Ferry Row 3 (brown, price 60), Income Tax 4 (tax 200, no price);
  - Jail 10, Rose Lane 16 (orange, price 180).
  - Everyone starts with 1500.
  - The chance deck's cards come before the treasury deck's, so an example's first `Get Out Of Jail Free` is the chance one and its second the treasury one.

- [ ] **Step 1: Board.** Add these eight lines under `Board:`, right after slice 6's `  The game has a high bid of 0.`:

```text
  Spaces can be offered.
  Spaces can be asked for.
  Cards can be handed over.
  Cards can be claimed.
  Players can be proposing.
  Players can be the trade partner.
  The game has a cash offer of 0.
  The game has a cash request of 0.
```

- [ ] **Step 2: The trade button.** In the playing phase, add the block below right after the build button's block (after `      If it has no hotel, it gets a house from the bank.`), before `  A player may end their turn.`:

```text
  A player may trade with another player.
    Only if no player has less than 0 money.
    Then:
      They are proposing.
      That player is the trade partner.
      The cash offer is 0.
      The cash request is 0.
      The trade phase starts with them.
```

- [ ] **Step 3: The trade phase.**
  - Add the phase below after the auction phase's After line, before `End:`. It must come after playing: the game starts in the first phase written.
  - It has no `Players take turns.` line. The proposer stays current while building the offer, and only propose is named by the After line.
  - The eight lines from `No space is offered.` to `The cash request is 0.` are written out in each of cancel, accept and decline.

```text
Phase: trade
  Hint: Offer and ask for spaces, cash and kept cards, then propose. The other player accepts or declines.
  A player may offer a space they own.
    Only if they are proposing.
    Only if it is not offered.
    Only if no street of its color has a building.
    Then:
      It is offered.
  A player may ask for a space the trade partner owns.
    Only if they are proposing.
    Only if it is not asked for.
    Only if no street of its color has a building.
    Then:
      It is asked for.
  A player may offer to pay an amount.
    Only if they are proposing.
    Only if they have at least the amount in money.
    Then:
      The cash offer is the amount.
  A player may ask to be paid an amount.
    Only if they are proposing.
    Then:
      The cash request is the amount.
  A player may offer everything they keep.
    Only if they are proposing.
    Only if their kept cards are not empty.
    Then:
      Every card in their kept cards is handed over.
  A player may ask for everything the trade partner keeps.
    Only if they are proposing.
    Then:
      For the trade partner, every card in their kept cards is claimed.
  A player may propose the trade.
    Only if they are proposing.
    Only if one of:
      some space is offered
      some space is asked for
      some card is handed over
      some card is claimed
      the cash offer is more than 0
      the cash request is more than 0
  A player may cancel the trade.
    Only if they are proposing.
    Then:
      No space is offered.
      No space is asked for.
      No card is handed over.
      No card is claimed.
      No player is proposing.
      No player is the trade partner.
      The cash offer is 0.
      The cash request is 0.
      Go back to the interrupted turn.
  A player may accept the trade.
    Only if they are the trade partner.
    Only if they have at least the cash request in money.
    Then:
      They own every space that is offered.
      Every card that is handed over goes to their kept cards.
      They pay the cash request to the player who is proposing.
      For the player who is proposing, they own every space that is asked for.
      For the player who is proposing, every card that is claimed goes to their kept cards.
      For the player who is proposing, they pay the cash offer to the trade partner.
      No space is offered.
      No space is asked for.
      No card is handed over.
      No card is claimed.
      No player is proposing.
      No player is the trade partner.
      The cash offer is 0.
      The cash request is 0.
      Go back to the interrupted turn.
  A player may decline the trade.
    Only if they are the trade partner.
    Then:
      No space is offered.
      No space is asked for.
      No card is handed over.
      No card is claimed.
      No player is proposing.
      No player is the trade partner.
      The cash offer is 0.
      The cash request is 0.
      Go back to the interrupted turn.
  After a player proposes the trade, the turn passes to the next player on the left who is the trade partner.
```

- [ ] **Step 4: Append these 17 examples** after the existing 82, for 99 in all. `kept cards change hands both ways` is the Review Focus case for kept cards. `accepting swaps everything in the offer`, `declining changes nothing` and `cancelling a trade changes nothing` are the Review Focus cases for the ways out.

```text
Example: starting a trade
  When p0 trades with p1
  Then it is accepted
  And the phase is trade
  And it is p0's turn
  And p0 is proposing
  And p1 is the trade partner
  And the cash offer is 0

Example: you cannot trade with yourself or with nobody
  When p0 trades with p0
  Then it is rejected because "Pick another player to trade with."
  When p0 trades with another player
  Then it is rejected because "Pick another player to trade with."

Example: you cannot trade while someone owes
  Given p1 has -10 money
  When p0 trades with p1
  Then it is rejected because "no player has less than 0 money"

Example: building an offer
  Given p0 owns Mill Lane
  And p1 owns Rose Lane
  When p0 trades with p1
  And p0 offers Mill Lane
  And p0 asks for Rose Lane
  And p0 offers to pay 100
  Then it is accepted
  And Mill Lane is offered
  And Rose Lane is asked for
  And the cash offer is 100
  When p0 offers Mill Lane
  Then it is rejected because "it is not offered"
  When p0 offers to pay 1600
  Then it is rejected because "they have at least the amount in money"

Example: you can only offer your own spaces and ask for the other player's
  Given p0 owns Mill Lane
  And p1 owns Rose Lane
  When p0 trades with p1
  And p0 offers Rose Lane
  Then it is rejected because "That isn't a space you own."
  When p0 asks for Mill Lane
  Then it is rejected because "That isn't a space the trade partner owns."

Example: a street whose color has a building cannot be offered
  Given p0 owns Mill Lane
  And p0 owns Ferry Row
  And Ferry Row has 1 house
  When p0 trades with p1
  And p0 offers Mill Lane
  Then it is rejected because "no street of its color has a building"

Example: an empty trade cannot be proposed
  When p0 trades with p1
  And p0 proposes the trade
  Then it is rejected because "some space is offered or some space is asked for or some card is handed over or some card is claimed or the cash offer is more than 0 or the cash request is more than 0"

Example: proposing hands the turn to the other player
  Given p1 owns Rose Lane
  When p0 trades with p1
  And p0 asks for Rose Lane
  And p0 proposes the trade
  Then it is accepted
  And the phase is trade
  And it is p1's turn

Example: the other player answers only after the proposal
  Given p1 owns Rose Lane
  When p0 trades with p1
  And p0 asks for Rose Lane
  And p1 accepts the trade
  Then it is rejected because "It's p0's turn."

Example: accepting swaps everything in the offer
  Given p0 owns Mill Lane
  And p1 owns Rose Lane
  When p0 trades with p1
  And p0 offers Mill Lane
  And p0 asks for Rose Lane
  And p0 offers to pay 100
  And p0 proposes the trade
  And p1 accepts the trade
  Then it is accepted
  And p1 owns Mill Lane
  And p0 owns Rose Lane
  And p0 has 1400 money
  And p1 has 1600 money
  And Mill Lane is not offered
  And Rose Lane is not asked for
  And p0 is not proposing
  And p1 is not the trade partner
  And the cash offer is 0
  And the phase is playing
  And it is p0's turn

Example: declining changes nothing
  Given p0 owns Mill Lane
  And p1 owns Rose Lane
  When p0 trades with p1
  And p0 offers Mill Lane
  And p0 asks for Rose Lane
  And p0 asks to be paid 50
  And p0 proposes the trade
  And p1 declines the trade
  Then it is accepted
  And p0 owns Mill Lane
  And p1 owns Rose Lane
  And p0 has 1500 money
  And p1 has 1500 money
  And Mill Lane is not offered
  And Rose Lane is not asked for
  And p1 is not the trade partner
  And the cash request is 0
  And the phase is playing
  And it is p0's turn

Example: cancelling a trade changes nothing
  Given p0 owns Mill Lane
  When p0 trades with p1
  And p0 offers Mill Lane
  And p0 offers to pay 100
  And p0 cancels the trade
  Then it is accepted
  And p0 owns Mill Lane
  And p0 has 1500 money
  And Mill Lane is not offered
  And p0 is not proposing
  And the cash offer is 0
  And the phase is playing
  And it is p0's turn

Example: kept cards change hands
  Given p1's kept cards has a Get Out Of Jail Free
  When p0 trades with p1
  And p0 asks for everything the trade partner keeps
  And p0 proposes the trade
  And p1 accepts the trade
  Then it is accepted
  And p0's kept cards has a Get Out Of Jail Free
  And p1's kept cards are empty
  And a Get Out Of Jail Free in p0's kept cards is not claimed

Example: kept cards change hands both ways
  Given p0 is on Jail
  And p0 is in jail
  And p0's kept cards has a Get Out Of Jail Free
  And p1's kept cards has a Get Out Of Jail Free
  When p0 trades with p1
  And p0 offers everything they keep
  And p0 asks for everything the trade partner keeps
  And p0 proposes the trade
  And p1 accepts the trade
  Then p0's kept cards has a Get Out Of Jail Free
  And p1's kept cards has a Get Out Of Jail Free
  When p0 uses a Get Out Of Jail Free
  Then it is accepted
  And the bottom card of the treasury pile is a Get Out Of Jail Free

Example: the other player must be able to pay
  Given p0 owns Mill Lane
  And p1 has 50 money
  When p0 trades with p1
  And p0 offers Mill Lane
  And p0 asks to be paid 100
  And p0 proposes the trade
  And p1 accepts the trade
  Then it is rejected because "they have at least the cash request in money"

Example: a mortgaged space trades as it is
  Given p0 owns Mill Lane
  And Mill Lane is mortgaged
  When p0 trades with p1
  And p0 offers Mill Lane
  And p0 proposes the trade
  And p1 accepts the trade
  Then it is accepted
  And p1 owns Mill Lane
  And Mill Lane is mortgaged
  And Mill Lane is not offered

Example: the turn resumes where it was
  Given p0 is on Go
  And p1 owns Rose Lane
  And the next roll is 1 and 3
  When p0 rolls the dice
  And p0 trades with p1
  And p0 asks for Rose Lane
  And p0 offers to pay 300
  And p0 proposes the trade
  And p1 accepts the trade
  Then p0 owns Rose Lane
  And p0 has 1000 money
  And p1 has 1800 money
  When p0 rolls the dice
  Then it is rejected because "they have not rolled this turn or they rolled a double"
  When p0 ends their turn
  Then it is accepted
  And it is p1's turn
```

How each number comes from the board and the rules:
- Mill Lane and Ferry Row are the two brown streets, so a house on Ferry Row blocks offering Mill Lane.
- An offer of 100 moves p0 from 1500 to 1400 and p1 to 1600. A declined request of 50 moves nothing.
- An offer to pay 1600 is more than the 1500 p0 has, and p1's 50 is less than a cash request of 100.
- 1 + 3 from Go lands on Income Tax (4), which has no price and charges 200: p0 has 1300. Paying 300 leaves 1000, and p1 has 1800.
  - Back on p0's turn, the roll is refused by slice 3's group, since 1 and 3 is no double.
  - Ending the turn passes slice 6's group, since Income Tax has no price.
- Both sides keeping a card:
  - p0 is given the chance deck's `Get Out Of Jail Free` and p1 the treasury deck's.
  - After the swap, p0 holds the treasury one, so using it puts it under the treasury pile.
  - Had a card gone back, one player would hold both cards and the other none, or p0 would still hold the chance one. Used, that one goes under the chance pile, and the treasury pile's bottom card stays its first, `Advance To Go`.
- In the answer-before-proposal example, the trade phase's turn is still p0's, so the flow refuses p1. The example shows that as "It's p0's turn.".

- [ ] **Step 5: Extend `rent-day.test.ts`.**
  - **Examples:** `results` has length 99, and all pass.
  - **Constants:**
    - the move types above as `TRADE`, `OFFER`, `ASK`, `OFFER_CASH`, `ASK_CASH`, `OFFER_KEPT`, `ASK_KEPT`, `PROPOSE`, `CANCEL`, `ACCEPT`, `DECLINE`;
    - `TRADE_PHASE = 'trade'`, `OFFERED = 'offered'`, `ASKED = 'asked for'`, `HANDED = 'handed over'`, `CLAIMED = 'claimed'`, `PROPOSING = 'proposing'`, `PARTNER = 'the trade partner'`, `CASH_OFFER = 'cash offer'`, `CASH_REQUEST = 'cash request'`;
    - `PREMIUM = 2`, `TRADE_KEEP = 200`, `ACCEPT_RATIO = 1.5`.
  - **Helpers:**
    - `holders(state, seats, flag)` lists the seats still in whose flag reads `true`;
    - `flaggedSpaces(state, flag)` lists the spaces whose flag reads `true`, in board order;
    - `noTrade(state, seats)` is true when no space is `OFFERED` or `ASKED`, no card is `HANDED` or `CLAIMED`, no seat is `PROPOSING` or `PARTNER`, and both cash numbers are 0. Every flag is read with `=== true`.
  - **The auto-player (`playTurn`).**
    - **The trade step**, once a turn: after the rolling loop and `if (!stillTheirs()) return;`, before building.
      - For each color in `colorsInBoardOrder()`, take its streets. Trade when all of these hold:
        - all but one of them are `by`'s;
        - the last is owned by a seat still in;
        - none of them has a building;
        - `by`'s money less `PREMIUM` times the last one's price is at least `TRADE_KEEP`;
        - `canDispatch({ type: TRADE, by, player: owner })` is `true`.
      - To trade, it makes `{ type: TRADE, by, player: owner }`, `{ type: ASK, by, target: last }`, `{ type: OFFER_CASH, by, amount: PREMIUM * price }` and `PROPOSE`, then plays the answer.
      - It trades for the first such color only, and otherwise doesn't trade.
    - **Playing the answer.** While the game is not over and the phase is `TRADE_PHASE`, the current seat answers:
      - with `value` the cash offer less the cash request, and `worth` the prices of the `ASKED` spaces less those of the `OFFERED` ones;
      - it makes `ACCEPT` when `value >= ACCEPT_RATIO * worth` and `canDispatch` allows `ACCEPT`, else `DECLINE`.
      - The auto-player always offers twice the price and asks no cash, so its proposals are accepted.
    - After the answer, `stillTheirs()` holds again, and the turn goes on to building and ending.
    - Update `playTurn`'s doc comment to say all this.
  - **`keepsTheRules`.** It keeps `trade: { proposer, partner, log, rolls } | null` between moves, beside slice 6's `open`.
    - **TRADE:**
      - before: the phase is playing, `by` is the current seat, `debtors(before, seats)` is `[]`, `move.player` is a seat still in other than `by`, and `noTrade(before, seats)`;
      - after: the phase is `TRADE_PHASE`, the current seat is `by`, `holders(…, PROPOSING)` is `[by]` and `holders(…, PARTNER)` is `[move.player]`, both cash numbers are 0, and no money moved;
      - `trade = { proposer: by, partner: move.player, log: [...(before's TURN_KEY entry for by ?? []), TRADE], rolls: before.data[TURN_ROLLS_KEY] ?? null }`.
    - **ASK:**
      - before: the phase is trade, `by` is `trade.proposer` and current, `move.target` is owned by `trade.partner`, and no street of its color has a building;
      - after: the space is `ASKED`, and no money moved.
    - **OFFER_CASH:** the cash offer after is `move.amount`, which is at most `by`'s money; no money moved.
    - **PROPOSE:** before, `by` is `trade.proposer` and current. After, the current seat is `trade.partner`, the phase is still trade, and no money moved.
    - **ACCEPT**, by `trade.partner`, with the cash offer and request read from before:
      - `moneyMoves(before, after, { [proposer]: request - offer, [partner]: offer - request }, …)`, so the money of all players together is unchanged;
      - every space `OFFERED` before is the partner's after, and every space `ASKED` before is the proposer's; every other space keeps its owner;
      - every space keeps its `mortgaged` flag, and no street of a traded space's color has a building;
      - every card `HANDED` before is in the partner's kept cards after, and every card `CLAIMED` before in the proposer's.
    - **The other trade moves** (OFFER, ASK_CASH, OFFER_KEPT, ASK_KEPT, CANCEL, DECLINE): no money moved and no owner changed.
    - **Whenever a trade ends** (the phase goes from trade to playing):
      - the current seat is `trade.proposer`;
      - `after.data[TURN_KEY]` is `{ [proposer]: trade.log }`, and `after.data[TURN_ROLLS_KEY] ?? null` equals `trade.rolls`;
      - `noTrade(after, seats)`.
      - Then set `trade = null`.
    - **After every move:** while the phase is playing, `noTrade(after, seats)`. While it is trade, exactly one seat is proposing and exactly one is the trade partner.
    - **The turn.** Slice 6's check widens again. When `after.turn.current` differs from `before.turn.current`, one of these also holds:
      - the move was PROPOSE and `after.turn.current` is `trade.partner`;
      - it was ACCEPT or DECLINE and `after.turn.current` is `trade.proposer`.
    - **The money branch.** The trade moves are handled above, before the final `expect(change).toBe(0)` branch.
    - Every earlier check stays. A trade's presses are logged and cleared within the trade, so "only the current seat has turn entries" holds throughout.
  - **2-player ending.**
    - It stays: at least 9 of seeds 1 to 10 reach a winner within 3000 turns.
    - Beside the jail, raising and auction tallies, add `trades: { accepted }`, counted on each ACCEPT. It must be above 0.
    - If it stays at 0, print the tallies and find out why before changing anything. If it is only chance, count it over the full-set runs as well: a counter shared by the `describe`, checked in a last `it`. Say so in the commit.
  - **4 and 8 players with full sets:**
    - These are unchanged: the seeds slice 6 left, within 5000 turns, a hotel built, and someone going out holding buildings. They are seeds 1, 2 and 3 at both 4 and 8 players (slice 5's last fix round made every seat pay off mortgages, so 8-player seed 3 ends again).
    - If a seed doesn't finish, try the next seed and say so in the commit. Don't raise the cap past 20000.
  - **The lean variant and undo:** unchanged. They now play through the trading auto-player.
- [ ] **Step 6: The page test that counts examples.** In `designer-page.test.tsx`, expect `99 of 99 examples pass`, and the test name says 99.
- [ ] **Step 7: Run** `bunx vitest run src/games/rent-day.test.ts src/pages/designer`.
  - Fix any failure in the phrases, not in the example numbers: the numbers come from the board above.
  - Then run `bun run test` and `bun run typecheck`.
- [ ] **Step 8: Commit**

```bash
git add src/games/rent-day.rules src/games/rent-day.test.ts src/pages/designer/designer-page.test.tsx
git commit -m "feat(games): Rent Day slice 7: trading spaces, money and kept cards on your own turn, accepted or declined by the other player"
```

---

### Task 6: The playtest shows the player picker, the offer's tags and marked kept cards; README

**Files:**
- Modify: `src/engine/core/lang/board-view.ts` (`BoardView.playerCardFlags`, `readSeatExtras`)
- Modify: `src/pages/designer/board-controls.tsx` (`ActionButtons`, `PlayerPicker`, `MoneyLine`), `src/pages/designer/board-grid.tsx` (tags), `src/pages/designer/playtest.tsx`, `README.md`
- Modify: the hand-built `BoardView`s in tests gain `playerCardFlags: {}`: `board-view.test.ts`, `src/pages/designer/board-parts.test.tsx` (`board()`) and `src/pages/designer/seat-status.test.ts` (`boardExtras`)
- Test: `src/engine/core/lang/board-view.test.ts`, `src/pages/designer/board-parts.test.tsx`, `src/pages/designer/playtest.test.tsx`

**Interfaces:**
- Consumes `ActionView.players` (Task 2), `HOLDING_BOARD` (Task 4), slice 5's `SpaceView.stripes`, and slice 6's `BoardView.gameNumbers` and `BoardView.interrupted`.
- **`BoardView.playerCardFlags: { [seat: string]: string[][] }`** runs parallel to `playerCards`: for each seat, one list per card shown, holding the card flags set on it (`cardFact(card, flag) === true`) in the order the game declares them. `readSeatExtras` requires it to be a map of lists of lists of text.
- **Tags.** A space shows one small text tag (`data-testid="tag"`) for each name in its `stripes`, so "mortgaged" and "offered" read apart. The stripe and the title stay as slice 5 made them. The look is the builder's.
- **`MoneyLine`.** A kept card with flags reads its name, then the flags in brackets, joined by ", ": `Get Out Of Jail Free (handed over)`.
- **`PlayerPicker`** (`board-controls.tsx`):
  - `PlayerPicker({ players, onPick, onRefused, onCancel }: { players: { [seat: string]: true | string }; onPick(seat: string): void; onRefused(reason: string): void; onCancel(): void })`.
  - It renders a `role="status"` banner with the text `Pick another player`, then one button per seat in seat order, then `Cancel`.
    - Each seat's button shows the seat in its color, with `aria-label` `` `Pick ${seat}` ``.
    - A seat whose verdict is not `true` is greyed (`aria-disabled`), with the reason as its title. Pressing it calls `onRefused(reason)`.
- **`ActionButtons`.** A button with `players !== null` calls `onPick(action)` when pressed, as a button with a target does.
- **`playtest.tsx`.**
  - While `picking` names a button whose latest view is allowed and has `players`, the banner slot shows `PlayerPicker`.
  - Picking a seat sends `{ type: move, player: seat }` and ends the picking. Cancel ends it without sending. A refused seat flashes its reason.
  - A button that has since been greyed ends the picking, as for spaces.
- No page code names a flag, a phase, a game number or a button.

- [ ] **Step 1: Write the failing tests.**

In `board-view.test.ts`, add `describe('seat views of the flags on kept cards')`:
- **The fixture.** A two-player `HOLDING_BOARD` engine whose Pass is in p0's kept cards.
- **Not lent.** Both seats' `board!.playerCards` is `{ p0: ['Pass'], p1: [] }` and `playerCardFlags` is `{ p0: [[]], p1: [] }`.
- **Lent.** On a state where the Pass is lent (`changeCard`), `playerCardFlags` is `{ p0: [['lent']], p1: [] }`.
- **Plain data.** `readSeatExtras` gives null for a board without `playerCardFlags`, and for `playerCardFlags: { p0: [['lent', 3]] }`.

In `board-parts.test.tsx`:

```ts
describe('the offer on the board and the money line, and picking another player', () => {
  it('tags a space with each flag it is striped for', () => {
    const spaces = [space('Go'), space('Mill Lane', { facts: { pledged: true, lent: true }, stripes: ['pledged', 'lent'] }), space('Treasury'), space('Ferry Row')];
    render(<BoardGrid board={board({ spaces })} />);
    const mill = screen.getByTitle('Mill Lane — pledged, lent');
    expect(within(mill).getAllByTestId('tag').map((tag) => tag.textContent)).toEqual(['pledged', 'lent']);
    expect(screen.getAllByTestId('tag')).toHaveLength(2);
  });
  it('marks a kept card with the flags set on it', () => {
    render(<MoneyLine board={board({ playerCards: { p0: ['Free Pass', 'Map'] }, playerCardFlags: { p0: [['lent', 'wanted'], []] } })} />);
    expect(screen.getByText('p0 1,500 money · Free Pass (lent, wanted) · Map')).toBeTruthy();
  });
  it('Review Focus: offers each seat listed, greys a refused one with why, and sends only one that may be picked', () => {
    const [onPick, onRefused, onCancel] = [vi.fn(), vi.fn(), vi.fn()];
    render(<PlayerPicker players={{ p10: true, p2: 'they are asleep' }} onPick={onPick} onRefused={onRefused} onCancel={onCancel} />);
    const picker = screen.getByRole('status');
    expect(within(picker).getByText('Pick another player')).toBeTruthy();
    const seats = within(picker).getAllByRole('button', { name: /^Pick p/ });
    expect(seats.map((b) => b.textContent)).toEqual(['p2', 'p10']);
    expect([seats[0].getAttribute('aria-disabled'), seats[0].getAttribute('title')]).toEqual(['true', 'they are asleep']);
    fireEvent.click(seats[0]);
    expect(onRefused).toHaveBeenLastCalledWith('they are asleep');
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.click(seats[1]);
    expect(onPick).toHaveBeenLastCalledWith('p10');
    fireEvent.click(within(picker).getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

Also add: **A pick button asks to pick.** In `ActionButtons`, a button with `players: { p1: true }` calls `onPick` with its action when pressed, and not `onPress`.

In `playtest.test.tsx` (import `markOut` from board-state and `zoneIdFor` from zones):

```ts
describe('Playtest: a trade', () => {
  const start = { ...withBoardData(initialState(rentDay, SEED), rentDay, ['p0', 'p1', 'p2']), turn: { current: 'p0', phase: 'playing' } };
  // p0 owns Mill Lane (1) and p1 owns Rose Lane (16).
  const owning = setOwner(setOwner(start, 1, 'p0'), 16, 'p1');
  const named = (name: string) => screen.getAllByRole('button', { name });
  const HINT = 'Offer and ask for spaces, cash and kept cards, then propose. The other player accepts or declines.';
  const startTrade = (initial = owning) => {
    mountRentDay({ initial });
    fireEvent.click(named('Trade with another player')[0]);
    fireEvent.click(within(screen.getByRole('status')).getByRole('button', { name: 'Pick p1' }));
  };

  it('Review Focus: lists only the other players still in, and starts the trade with the one picked', () => {
    mountRentDay({ initial: markOut(owning, 'p2') });
    fireEvent.click(named('Trade with another player')[0]);
    const picker = screen.getByRole('status');
    expect(within(picker).getAllByRole('button', { name: /^Pick p/ }).map((b) => b.textContent)).toEqual(['p1']);
    fireEvent.click(within(picker).getByRole('button', { name: 'Pick p1' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText(`seat: p0 — trade — Your turn — ${HINT}`)).toBeTruthy();
    expect(screen.getByText(`seat: p1 — trade — ${HINT} — waiting for p0`)).toBeTruthy();
  });
  it('tags a space in the offer on every board, and shows the cash offer on every bank line', () => {
    startTrade();
    fireEvent.click(named('Offer')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Pick Mill Lane' }));
    expect(document.querySelectorAll('[data-stripes="offered"]')).toHaveLength(3);
    expect(screen.getAllByTestId('tag').map((tag) => tag.textContent)).toEqual(['offered', 'offered', 'offered']);
    fireEvent.change(screen.getAllByRole('spinbutton', { name: 'Offer to pay amount' })[0], { target: { value: '100' } });
    fireEvent.click(named('Offer to pay')[0]);
    expect(screen.getAllByText('bank: 32 houses, 12 hotels · cash offer 100')).toHaveLength(3);
  });
  it('marks the kept cards in the offer on every money line', () => {
    const pass = owning.cards.find((card) => card.data?.name === 'Get Out Of Jail Free')!.id;
    startTrade(relocate(owning, [pass], zoneIdFor('kept cards', 'p0'), rentDay));
    fireEvent.click(named('Offer everything you keep')[0]);
    expect(screen.getAllByText('p0 1,500 money · proposing · Get Out Of Jail Free (handed over)')).toHaveLength(3);
  });
  it("hands the turn to the other player once proposed, who accepts, and goes back to the proposer's turn", () => {
    startTrade();
    fireEvent.click(named('Offer')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Pick Mill Lane' }));
    fireEvent.click(named('Propose the trade')[0]);
    expect(screen.getByText(`seat: p1 — trade — Your turn — ${HINT}`)).toBeTruthy();
    expect(named('Accept the trade')[0].getAttribute('title')).toBe("It's p1's turn.");
    expect(named('Decline the trade')[1].getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(named('Accept the trade')[1]);
    expect(document.querySelectorAll('[data-stripes]')).toHaveLength(0);
    expect(screen.getAllByTitle('Owned by p1')).toHaveLength(6);
    expect(screen.getByText('seat: p0 — Your turn — Roll the dice, then buy, build, or end your turn. A double rolls again.')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/board-view.test.ts src/pages/designer`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Check it in the browser.**
  - Run `bun run dev`, open `/#designer`, load Rent Day and press Play with 2 players.
  - Write a throwaway Playwright script (Playwright is installed globally, Chromium in `/opt/pw-browsers`) in your own scratchpad directory, never in the repo.
  - **Getting a space to offer.** Each turn, the current seat presses its enabled `Roll the dice` (again while it stays enabled), then `Buy the space you are on` if enabled, else `Auction the space you are on` (both seats then press `Drop out` until it ends), then `End your turn`. Stop once p0 owns a space and it is p0's turn.
  - **Building the offer.**
    - p0 presses `Trade with another player` and picks p1 in the banner.
    - p0 presses `Offer` and picks the outlined space.
    - p0 types 100 in `Offer to pay amount` and presses `Offer to pay`.
    - Check that both status lines start `seat: pN — trade — `, both bank lines end `· cash offer 100`, and both boards show the space's tag.
  - Take a screenshot and look at it:
    - the picker banner reads cleanly while it is open;
    - the tag is legible on a pale space and on a colored one, beside the owner mark and the pieces;
    - the money line reads `proposing` after p0's numbers.
  - **Answering.** p0 presses `Propose the trade`, and p1 presses `Accept the trade`. Check that p0's money line is 100 lower, p1's 100 higher, the space shows p1's owner mark on both boards, and no tag is left.
- [ ] **Step 5: Run** `bunx vitest run src/pages/designer`, then `bun run test` and `bun run typecheck`. Then run the five checks below:
  - the first prints only the `library/index.ts` import of `./rent-day`;
  - the second and third print nothing;
  - the fourth prints only `refs.ts`'s irregular participle line (`bid: 'bid'`);
  - the fifth prints only lines that were there before this slice (the example runner's `claim` and the four comments named under Global Constraints). Check any other line with `git blame`: a line this slice added must be reworded.

```bash
grep -rniE '\b(jail|rent|houses?|hotels?|streets?|stations?|utilit(y|ies)|money|mortgage[ds]?|bankrupt(cy)?)\b' src/engine/core/lang --include=*.ts | grep -v '\.test\.ts' | grep -v 'library/rent-day.ts' | grep -v 'lang/testing.ts'
grep -rniE '\b(chance|treasury|mortgage[ds]?|bankrupt(cy)?)\b|get out of jail free' src/engine src/pages --include=*.ts --include=*.tsx | grep -v '\.test\.' | grep -v 'lang/testing.ts' | grep -v 'library/rent-day.ts'
grep -rniwE 'jail|mortgaged' src/pages/designer | grep -v '\.test\.'
grep -rniE '\b(auction(s|ed)?|bid(s|der|ders|ding)?|high bid)\b' src/engine src/pages --include=*.ts --include=*.tsx | grep -v '\.test\.' | grep -v 'lang/testing.ts'
grep -rniE '\b(trad(e|es|ed|ing)|offer(s|ed|ing)?|propos(e|es|ed|ing|al)|partners?|cash|handed over|claim(s|ed|ing)?|asked for)\b' src/engine src/pages --include=*.ts --include=*.tsx | grep -v '\.test\.' | grep -v 'lang/testing.ts'
```

- [ ] **Step 6: Update the README.**
  - Under *Designing a game*, change "with 82 examples" to "with 99 examples".
  - After the **Auctions.** paragraph, add a **Trading.** paragraph covering these points:
    - **Picking another player.**
      - A button whose wording ends in "another player" (`A player may trade with another player.`) picks a seat still in, other than the presser's. The playtest lists them in a banner after the press.
      - `That player is the trade partner.` reads the pick. Such a line anywhere else is reported.
      - A missing or wrong pick is refused with "Pick another player to trade with.". Examples say `When p0 trades with p1`.
    - **Picking a space without "on".**
      - A wording whose last part reads as a target picks a space: `A player may offer a space they own.` is labelled "Offer". Examples say `When p0 offers Mill Lane`.
      - Two buttons in one phase that would read the same label are reported.
    - **The player who holds a flag.**
      - "the player who is proposing", or the flag alone when its name starts with "the" ("the trade partner").
      - `a space the trade partner owns`, `They pay the cash request to the player who is proposing.`
      - `For the player who is proposing, they own every space that is asked for.` runs the rest of the line as that player: "they" and "their" are them.
      - No player, or two, holding the flag is an error that names it.
    - **Every, no and some.** `They own every space that is offered.`, `Every card that is handed over goes to their kept cards.`, `No card is handed over.`, `some space is offered`, `some card is claimed` and `their kept cards are not empty`. A card's flags go with it from zone to zone.
    - **Game numbers:** `the cash offer is more than 0`, `they have at least the cash request in money`.
    - **A phase that starts with them.** `The trade phase starts with them.` interrupts the turn as the auction does, and the player who pressed stays current.
    - **In the playtest,** the player picker, a tag on each striped space ("offered" beside "mortgaged"), kept cards marked with their flags (`Get Out Of Jail Free (handed over)`), and the cash numbers on the bank line.
    - **Rent Day** trades on the proposer's own turn, never while anyone owes. A street whose color has a building can't be traded, and a mortgaged space trades as it is.
  - In the roadmap, mark the board games shipped:
    - Move the **Tokens and meeples** entry out of **Next:** to the end of the numbered list, as item 7. **Next:** keeps Online play.
    - It reads: "7. **Tokens and meeples** — ✅ shipped: non-card pieces, in the engine and in the designer language, in the seven slices of [the board games overview](docs/superpowers/specs/2026-10-15-board-games-overview-design.md): around the board, sets and buildings, doubles and jail, Chance and Treasury cards, raising money, auctions, and trading (buttons that pick another player, space picks without “on”, the player who holds a flag, and every, no and some over flags). Rent Day plays the whole game."
- [ ] **Step 7: Commit**

```bash
git add src/engine/core/lang/board-view.ts src/engine/core/lang/board-view.test.ts \
  src/pages/designer/board-controls.tsx src/pages/designer/board-grid.tsx src/pages/designer/playtest.tsx \
  src/pages/designer/board-parts.test.tsx src/pages/designer/playtest.test.tsx src/pages/designer/seat-status.test.ts README.md
git commit -m "feat(designer): a player picker, tags for flagged spaces and kept cards marked with their flags; docs: README, the board games shipped"
```
