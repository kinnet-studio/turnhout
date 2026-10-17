# Startup Simulator Slice 4-3 (The page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The playtest page shows slice 4. Each player's tableau gets Blue and Red bandwidth gauges, Offline products are drawn faded, a product's Bugs and a flex Senior's mode show on its card, and the declaration, the ops check, Ops QA and the final check are played from the private strip.

**Architecture:**
- **This is plan 4-3 of three** (spec R10). It runs after plan 4-2 is complete and takes plans 4-1 and 4-2 as given (see "Assumed from earlier plans").
  - It changes no rules text, no phrase and no rule meaning.
  - What the page needs and those plans don't provide is listed under "Gaps against plans 4-1 and 4-2" at the end, not planned here.
- **Five tasks:**
  1. what the view says about each player (core);
  2. faded cards, Bug badges and mode labels (canvas and Board lines);
  3. the gauges;
  4. a card that sits on a card in a zone where only some do hangs under it (the Growth Hacker under its product);
  5. the browser check, the README and the final checks.
- **Nothing in shared code knows Startup Simulator.** The page works from what the view carries and what the game declares.
  - **Core (pure).**
    - `worked-view.ts` reads from the compiled game alone which player values the page may show, which pairs make gauges, and which flags fade a card.
    - `seatExtras` gains `playerValues`.
  - **Rendering.** `CardDecor` gains `dim`, which `CardSprite` draws as faded faces.
  - **Layout.**
    - `LayoutOptions` gains `keepPlaced`: a row that draws a card at its own place, and spaces only the others.
    - `fittedLayout` sets `keepPlaced` on a `'some'` zone's row.
    - `stackOnHolders` hangs that zone's cards on cards.
  - **Page** (`src/pages/designer`).
    - `board-text.ts` gains counts that no column reads, and widens the badge.
    - A new `gauges.ts` holds the gauge copy.
    - `tableaux.tsx` and `playtest.tsx` wire them up.
- **Calls this plan makes** (the spec leaves "the gauges' look" to the builder):
  1. **What the view carries (`SeatExtras.playerValues`).**
     - Every seat's value for each player value the page may show, by seat and then name. Every seat looking gets the same map. It is left out when the game shows none.
     - **Which values may be shown** (`shownPlayerValues`). This mirrors 3-2's rules-only test for worked values. A value is shown when each of its lines:
       - is the total line `A player's X is the total Y of <cards in zones>`;
       - adds up only zones everyone can see (a shared zone or a zone each player has);
       - reads only through what reads the card and the cards on it: its number, and each name its group's tests read (`… that are not resting`, `… whose skill is more than 1`), are a column, something cards keep, or a worked value that `readsOnlyCards`.
     - So the choice hangs on the rules alone. A value is never shown to some seats and not others, and never because of where cards happen to be.
     - A value the runtime throws at for a seat is left out of that seat's entry, so one mistake leaves every view whole.
  2. **The gauges.**
     - **Which pairs.** A gauge pairs two shown values that a button waits on: `Only if their X is at least their Y.`, in the order written, each pair once. In Startup Simulator this is the ops check's confirm, which gives Blue (supply, demand) and Red (supply, demand). `is more than` makes no gauge, so the clean button's QA comparison doesn't make one.
     - **Where.** On a line of their own under each seat's tableau line on the fitted page, before its Board line: `Blue supply 2 / demand 1 · Red supply 0 / demand 1 (short)`.
     - **Look.** A short gauge is also drawn in `#ff8a65`. A seat that is out has none.
  3. **Bug badges.** A count kept on cards that no count part reads (it has no column with its front words, and rides on no count that has one) is a *lone count*. It is shown as `counted(n, name)` while it isn't 0: `2 bugs`, `1 fixed bug`. It goes in the card's badge and in the square brackets of its Board line, after the count parts: `[Blue 0/4, Red 0/0, 1 bug]`.
  4. **Mode labels.** The badge also names the flags the card keeps that are set, before the shown worked flags: `red mode`, `qa mode`, `onboarding`, `offline`. These are exactly the flags its Board line's round brackets already name.
     - **A flex Senior in Blue, the default, shows no mode label.** Only a declared mode other than the default is labelled. The reason: R4 makes Blue the absence of `red mode` and `qa mode`, so there is no flag to name, and R4 reserves the name `blue mode` for slice 5's trained QA Junior.
     - Badges, as well as fades, cover only cards in a zone each player has that everyone can see, cards on cards included. That is the same set the view works values out for.
  5. **Faded.** A card on a Board that has a kept flag which a shown player value's group leaves out (`the cards in their operations that are not offline`) is drawn faded: `CardDecor.dim`, with its two faces at alpha 0.4. Its ring, caption and badge stay bright.
  6. **The private strip.** The declaration, the ops check, Ops QA's clean and the final check need no new page state. They use 3-2's buttons, card picker, card offer and choice step unchanged:
     - `Declare a card in your ops team`, then `Choose one` with `Blue` / `Red` / `QA`, as the card allows;
     - `Switch off …` / `Switch on …` / `Confirm the products online`;
     - `Clean a card in your operations`.

     Tasks 2–3 test each one through the picture it changes.
  7. **Cards on cards in a `'some'` zone hang under their card.** This is the Growth Hacker under its product, as the rulebook's table shows it.
     - The zone keeps its board row (4-1's guard: still `layout: 'row'`), and its def gains `layoutOptions.keepPlaced`.
     - `stackOnHolders` gives each of its cards that sits on a drawn card the place 1b-3 gives an `'every'` zone's card: the same column, `STACK_GAP` and `STACK_STEP`.
     - Its other cards stay in the row, which spaces only them. A stale place is dropped from the copy, so it never pulls a card out of the row.
     - Hidden information is as 1b-3 has it, checked at `109ad8e`: `fittedLayout` draws only the viewer's own zones, and `SeatCanvas` places only cards in drawn zones. So only the viewer's own stacks are on its canvas, and a rival's stack is named only on the rival's Board line.
- **Parked, unchanged:**
  - **Gauges on a page that fits one table.** Its money line is unchanged.
  - **Worked values in the hover line.**

**Tech Stack:** TypeScript (strict), Bun, Vitest + happy-dom, React 19, PixiJS 8; Playwright (global install, Chromium in `/opt/pw-browsers`) for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-16-startup-slice-4-modes-ops-bugs-design.md` is binding, above all "The page" and the rulings R1–R10:
- "Blue and Red bandwidth gauges (supply against demand)… Offline products are shown dimmed";
- "Bugs show as a badge on the product. Each flex staff member shows its mode";
- "The mode declaration and the Offline choice appear in the private strip";
- R7: "The page pairs them for the gauges";
- R10: "4-3, the page (about 3, after 3-2): gauges, Offline dimmed, Bug badges and mode labels; the declaration, Offline step and final check in the private strip; happy-dom and browser checks".

It sits under `docs/superpowers/specs/2026-10-16-startup-simulator-overview-design.md`, also binding: "The page", its anti-goals (hidden information leaking; Startup words in shared code), and "Designers never see engine words". Plans 4-1 (`…-4-1-language.md`) and 4-2 (`…-4-2-rules-and-runs.md`), with their Global Constraints amendments, are inputs. So is 4-2's "Forward notes for plan 4-3".

## Global Constraints

- **Controller amendment (pre-flight at `f021e63`).** The scan is in the plan's SDD workspace (`preflight.md`; probes in the scratchpad's `pf43/`); 0 of 109 assumed items differ, and every pin of Tasks 1–4 passes in the probe with P1–P2 applied. Each task's brief carries its rulings. In short:
  - **P1 (Task 2).** Task 2's mode test also checks `seatButtons()` after `End your actions` is `['Declare a card in your development team', 'Declare a card in your ops team', 'Confirm your modes']`, so the helper is used where it is declared (typecheck rejects unused declarations).
  - **P2 (Tasks 1, 3).** A 3-player `GAUGED_GAME` starts from `{ ...initialState(game, 1), turn: { current: 'p0', phase: 'working' } }` (Setup can't deal 6 jobs from a pile of 4).
  - **P3 (all).** Task 1 starts after the speed-up plan is complete; BASE is recorded then.
  - **P4 (Tasks 1–2).** No `bugged` flag is shown; Bugs show as the count label `1 bug`.
  - **P5 (Task 2).** An offline product shows its printed Val (the hover line reads `val 5 · … · offline yes`); add the guard that hovering the switched-off Dating App shows `val 5`. Forward note: worked values in the hover line must never read `val` through `portfolio points`.
  - **P6 (parked).** An off-turn seat's greyed product button keeps the shared view's first reason ("There is no card in your operations."); changing the order would break two pinned lines. Owner's list.
  - **P7 (forwarded to 5-2a).** The modes Hint's "or Bugs for the Fixer" should say `QA`; 4-3 changes no rules text.
  - **P8 (Task 5).** The README step lists four bullets (the text says three); add all four.
  - **P9 (Tasks 4–5).** Task 5's changed-test-lines check prints exactly Task 2's two `boardBadges` lines.
  - **P10 (Task 1).** Every seat keeps an entry in `playerValues` (`{}` when all its values throw); `playerValues` itself is left out only when the game shows no value.

- **Branch and commits.** Develop on `claude/peaceful-curie-rdfkow`. Commit by pathspec, never `git add -A`. Every commit message ends with these two lines and contains no model identifiers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC`
- **Protected files never change:** `src/engine/core/game-state.ts`, `src/engine/core/flow.ts`, `src/engine/core/game-engine.ts`, `src/pages/hearts-demo/**`.
- **The core stays pure:** no pixi/react/DOM in `src/engine/core/**`, no `Math.random` or `Date.now`.
- **State is Json-only, under `lang:*` keys.** This plan adds no `state.data` key, no card `data` key and no move field. The view's `playerValues` is Json; an empty part is left out, never set to `undefined`.
- **No Startup Simulator words in shared code** (code, comments, test names and fixture strings). The banned list includes tag, lead, license, tier, stall, sector, expertise, mode, bandwidth, bug, qa, online, offline, maint, supply, demand, with plan 1b-2's words: capital, talent, agency, junior, backlog, growth, crash, vaporware, university, bench, ideation, startup, research, recruit, product, job market, idea pool, "seed" meaning a deck/market/card/product, greenlight, launch, pivot, salary, payroll, project, cube, ops, operations, onboarding, scouting, source/sourcing in the game sense, market share.
  - **Where they may appear:** `src/games/startup-simulator.*`; `src/pages/designer/designer-page.test.tsx`, `playtest-fitted.test.tsx` and `tableaux.test.ts`; `src/pages/designer/samples.ts`; `README.md`; `docs/`.
  - **Shared doc comments** take their examples from fixtures: `Red force 2 / load 2`, `2 dents`, `… that are not resting`.
  - **Shared code never spells `CondGroup`'s field `mode`.** It reads a group's `refs` only.
  - **Ordinary words to avoid:** write "a mistake in the code", not "a bug".
- **Hearts, Color Match, Venom and Rent Day stay unchanged** (Rent Day keeps its 108 examples). Their views carry no `playerValues` key, and their tables get no `decor`.
- **Every number comes from the rulebook.** Each Startup test says where its numbers come from (§20's tables).
- **Hidden information** (overview anti-goal; 3-2's lessons):
  - What the view shows is decided by the compiled game alone, never by which hidden cards are where.
  - The view never carries a value worked out from a card or zone the seat can't see.
  - Badges, fades and Board text read only the cards as the seat's scene gives them. A face-down card has no data, so it gets none.
- **No new page state.** Gauges, fades and badges are derived from the latest view in the render that receives it, so none outlasts its view for one render (3-2's lesson for rings and pickers).
- **No measured `Text`.** A `Text`'s size is never measured under happy-dom. This plan adds no Pixi text; any width is taken with `boldTextWidth`.
- **The page never changes a product's Online state.** It only sends the presses the view lists (spec anti-goal).
- **Plans 4-1 and 4-2 are built first.** Their code is referred to by the names their Interfaces blocks give. Each task re-checks those names at HEAD before starting, and stops and reports one that differs.
- **Existing tests.** No existing test line changes, except:
  - the two `boardBadges` lines Task 2 names;
  - in Task 4, the line of 4-1's `fit-layout.test.ts` guard that pins the `'some'` row's `layoutOptions`, if it pins them exactly. Name it in the report.

  New names are imported on new `import` lines. If any other existing test fails, stop and report it.
- **The browser check** uses the pre-installed Chromium (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; never `playwright install`). Its scripts and screenshots stay in `/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-4-3/`, never in the repo.
- **Page copy (exact):**
  - **A gauge:** `{first name, first letter upper} {a} / {second name less the words both names start with} {b}`, then ` (short)` when a < b, for example `Red force 1 / load 2 (short)`. When the second name is all shared words, it is given whole.
    - Gauges are joined by ` · ` in `<div data-testid="gauges-{seat}">`, in the seat's color.
    - A short gauge's `<span>` has `color: #ff8a65`.
  - **A badge:** the kept flags that are set (declared order), then the shown worked flags that hold, then the lone counts (declared order), joined by `, `. For example `tired, busy, 1 dent`.
  - **A Board card:** `{name}{ ({words, flags})}{ [{count parts, lone counts}]}{ with {cards on it}}`. Words come only for a card with count parts, as before.
  - **A faded card:** both faces at alpha `0.4`.
- **Commands.**
  - Single file: `bunx vitest run <path>`. Full suite: `bun run test`. Types: `bun run typecheck`.
  - Before Task 1, record `BASE=$(git rev-parse HEAD)` once plan 4-2 and its fixes are in. Run `bun run test` once to get the passing count and the long runs' time.
- **No new dependencies.**
- **Style.**
  - 2-space indent, single quotes, comments that say why.
  - TDD every task: failing test → watch it fail → implement → pass → `bun run typecheck` → commit.
  - A test marked "(guard)" passes before its task's change, and says so.

## Review Focus

- **A player value that reads a zone some seat can't see** (a stash, the pile), or reads through a worked value or flag that does (`hoarded`).
  - Expected: it is in no seat's view, not even its owner's, and makes no gauge.
  - Test: Task 1.
- **A value the runtime throws at for one seat** (a worked value that loops).
  - Expected: that seat's entry lacks it, every other value and seat is still there, and the page draws no gauge for that seat's pair.
  - Tests: Task 1 (view) and Task 3 (`gaugesOf`).
- **A product switched off and back on in one ops check, or a switch undone.**
  - Expected: the fade and the `offline` label come and go with the view.
  - Test: Task 2.
- **A card the seat can't see that has a count or a flag** (a rival's backlog card, or the seat's own).
  - Expected: no badge, no fade and no Board text.
  - Test: Task 2.
- **A seat that is out, or a game with nothing to gauge** (Color Match).
  - Expected: no gauges line.
  - Tests: Task 3.

## Assumed from earlier plans (check before Task 1)

Re-read each item at HEAD by name, not by line; if one is missing or differs, stop and report it.

- **3-2 (built):**
  - `lang/worked-view.ts`: `standIns`, `shownFlags`, and the private `readsOnlyCards`, `isWorked` and `cardOnlyNames`.
  - `lang/board-view.ts`: `SeatExtras = { board; actions; worked? }`, `workedView`, `cardsKept`, `seesFace`, `seatExtras` and `readSeatExtras`.
  - `designer/board-text.ts`: `countParts`, `flagsOn`, `wordsOf`, `boardText`, `boardCaptions` and `boardBadges(cards, worked?)`.
  - `designer/tableaux.tsx`: `tableauLine` and `Tableaux({ game, seats, board, cards, worked })`.
  - `designer/playtest.tsx`, `SeatCanvas`: `captions`, the `decor` memo (rings, captions, badges) and the `Tableaux` call.
  - 3-2's choice step (`choice-step.ts`, `choice-picker.tsx`), the card picker and the card offer.
  - `scene.ts`: `CardDecor = { ring?; caption?; badge? }`. `pixi/card-sprite.ts`: `setDecor`, with the badge sized by `boldTextWidth`.
  - Test scaffolds:
    - `playtest-fitted.test.tsx`: `mount`, `setUp`, `idOf`, `S`, `N`, `O`, `after`, `hint`, `lineOf`, `status`, `press`, `picker`, `pickNamed`, `click`, `offer`, `choose`, `ring` and `offered`. `tab` and `boardOf` are local to a describe, so define your own.
    - `board-text.test.ts`: `CREW`, `TIRED`, `arrange`, `idsOf`, `cardOf` and `arrangeShown`.
    - `worked-view.test.ts`: `compiled`, `arranged`, `SHOWN`, `HOARDING`, `PRIVATE_CREW` and `LOOPING`.
- **1b-3 (built):**
  - `core/layout.ts`: `computeZoneLayout`, whose `'row'` case spaces every card it is given, and whose `'free'` case reads `data.x` and `data.y`.
  - `scene.ts`: `LayoutOptions`.
  - `lang/fit-layout.ts`: `fittedLayout`, whose `isAttached` holds only for `onCards === 'every'`; `boardDef`; `stackOnHolders`, which hangs only free zones' cards; and `STACK_GAP` (36) and `STACK_STEP` (34).
  - `fit-layout.test.ts`'s `BOARD`, and its `describe('cards stacked under the card they sit on')`.
- **4-1 (built):**
  - `CompiledGame.playerValues` and `LangRuntime.playerValue(state, seat, name)`.
  - `registerPlayerValuePhrases`, with the value `a player's {playervalue} is the total {attribute} of {cardgroup}` and the condition `their {playervalue} is at least their {playervalue}`.
  - `CardFilter`'s `{ flag: string; wanted: boolean }`, read from `… that are (not) …`.
  - `FORCE_GAME` and `RESTING_GAME` in `testing.ts`.
  - `ZoneSpec.onCards: 'every' | 'some'` and `holders`, with 4-1 Task 5's guard in `fit-layout.test.ts`: `BOARD` with `idle` marked `'some'` keeps `idle-p1` a board row.
  - `END_STEPS_KEY`.
- **4-2 (built):**
  - Flags `red mode`, `qa mode` and `offline`; counts `bugs` and `fixed bugs`.
  - Player values `blue supply` … `bugged products`, in its order.
  - Phases `modes`, `ops check`, `engine` and `final check`, each with its Hint.
  - Buttons: `declare a card in their development team` / `… ops team`, `confirm their modes`, `switch off a card in their operations`, `switch on …`, `confirm the products online` (with `Only if their blue supply is at least their blue demand.` and its red twin), and `clean a card in their operations`.
  - `Blue demand:` and `Red demand:` read `… the cards in their operations that are not offline`.
  - `Bugged:` is `Only if its bugs are more than 0.` (see G1).
  - The `Example:`s that pin each phase's stops: for instance, a turn starts in `modes` only with a flex Senior or the Fixer on the Board.

---

### Task 1: What the view says about each player

Before starting: re-check the 3-2 and 4-1 names above at HEAD. The Startup pins assume `bugged` is not shown (G1; plan 4-2's pre-flight amends its pin). If HEAD shows it, `bugged products` is shown as well: add it last to the pin and say so in the report.

**Files:**
- Modify: `src/engine/core/lang/library/player-value-phrases.ts` (export two phrase texts)
- Modify: `src/engine/core/lang/worked-view.ts`, `src/engine/core/lang/board-view.ts`, `src/engine/core/lang/testing.ts` (`GAUGED_GAME`)
- Test: `src/engine/core/lang/worked-view.test.ts` (append), `src/games/startup-simulator.test.ts` (append)

**Interfaces:**
- Consumes: `readsOnlyCards`, `isWorked` (worked-view's own), `runtime.playerValue`, `FORCE_GAME`, `RESTING_GAME`.
- Produces (for Tasks 2–3):

```ts
// library/player-value-phrases.ts: each used in its own registration
export const PLAYER_TOTAL = "a player's {playervalue} is the total {attribute} of {cardgroup}";   // args [name, attribute, group]
export const AT_LEAST_THEIRS = 'their {playervalue} is at least their {playervalue}';           // args [x, y]
// worked-view.ts
/** The values worked out for players the page may show, in section order (call 1). */
export function shownPlayerValues(game: CompiledGame): string[];
/** Each pair of shown values a button waits on, `Only if their X is at least their Y.`, as [X, Y], in phase, button and line order, once. */
export function gaugePairs(game: CompiledGame): [string, string][];
/** The flags cards keep (`Cards can be …`) that a shown value's group leaves out (`{ flag, wanted: false }`), in the order declared. */
export function dimFlags(game: CompiledGame): string[];
// board-view.ts
/** Each seat's shown player values, by seat then name; the same for every seat looking. */
export type PlayerValuesView = { [seat: string]: { [name: string]: number } };
export type SeatExtras = { board: BoardView | null; actions: ActionView[]; worked?: WorkedView; playerValues?: PlayerValuesView };
// testing.ts
/** RESTING_GAME where stopping waits on a player's red force reaching their red load. */
export const GAUGED_GAME = RESTING_GAME.replace('  A player may stop.', '  A player may stop.\n    Only if their red force is at least their red load.');
```

- **`shownPlayerValues`** keeps a value when every ref of it meets all of these:
  - its phrase is `PLAYER_TOTAL`;
  - `args[2]` is a group of `kind: 'in'`;
  - every `ZoneRef` of the group names a zone with `visibility: 'public'`: `{ shared }` a shared zone, and `{ each }` or `{ of }` a zone each player has;
  - `args[1]`, and each filter's `attribute` or `flag`, is not worked or `readsOnlyCards`;
  - no filter is `sameAs`.

  A game without `playerValues` gives `[]`.
- **`gaugePairs`** walks `game.phases` → `actions` → `conditions` → `refs` and keeps refs with phrase `AT_LEAST_THEIRS` whose two names are both shown.
- **`seatExtras`** adds `playerValues` when `shownPlayerValues` is non-empty.
  - Every seat of the game has an entry, out seats included; the page hides theirs.
  - Each value is worked out with `runtime.playerValue` inside its own `try`/`catch`. A throw leaves that one value out of that seat's entry.
- **`readSeatExtras`** accepts `playerValues` when it is absent, or a map of maps of numbers. Anything else is null.

- [ ] **Step 1: Write the failing tests.**

  In `worked-view.test.ts`, append `describe('what the view says about each player')`. It has a local `VALUES`, six sections in fixture words:

```ts
const VALUES = [
  'Job pay:', "  A player's job pay is the total red pay of the cards in their workshop.", '',
  'Spare pay:', "  A player's spare pay is the total pay of the cards in their workshop that are not busy.", '',
  'Open force:', "  A player's open force is the total skill of the cards in the hall.", '',
  'Deep pay:', "  A player's deep pay is the total pay of the cards in the pile.", '',
  'Kept pay:', "  A player's kept pay is the total pay of the cards in their stash.", '',
  'Team force:', "  A player's team force is the total skill of the cards in their crew.",
].join('\n');
```

  - **Which are shown.**
    - `shownPlayerValues` of `SHOWN` + `VALUES` is `['job pay', 'spare pay', 'open force', 'team force']`.
    - **Review Focus.** Of `HOARDING` + `VALUES` + `Clean pay:\n  A player's clean pay is the total pay of the cards in their workshop that are not hoarded.`, it is `['spare pay', 'open force', 'team force']`. Red pay and `hoarded` read every stash.
    - **Review Focus.** Of `PRIVATE_CREW` + `VALUES`, it is `['open force']`.
    - `FORCE_GAME` gives `['red force', 'red load']`, and `CREW_GAME` gives `[]`.
  - **Gauges.**
    - `gaugePairs(GAUGED_GAME)` is `[['red force', 'red load']]`.
    - It is the same with the line also put under `  A player may finish a card in their workshop.`'s `    It costs 1 move.`.
    - With `is more than` in place of `is at least`, it is `[]`.
    - **Review Focus.** With `Kept pay` added and the stop's line `Only if their red force is at least their kept pay.`, it is `[]`.
  - **Faded flags.**
    - `dimFlags(RESTING_GAME)` is `['resting']`.
    - `dimFlags(FORCE_GAME)` is `[]`.
    - `dimFlags` of `SHOWN` + `VALUES` is `[]`, since `busy` is worked, not kept.
  - **The view.** A 3-player `GAUGED_GAME` engine at seed 1, arranged as 4-1 Task 1 does:
    - p0's workshop holds the first Vase, with the first Potter and the first Tinker `putOn` it in `crew-p0`;
    - p1's workshop holds the first Statue, with the first Smith on it in `crew-p1`.

    The checks:
    - for each viewer p0, p1 and p2, `seatExtras(…).playerValues` is `{ p0: { 'red force': 2, 'red load': 2 }, p1: { 'red force': 0, 'red load': 1 }, p2: { 'red force': 0, 'red load': 0 } }`;
    - with `resting: true` on the Statue, p1's `red load` is 0.
  - **Review Focus: a throw.** `LOOPING` + `Loop pay:\n  A player's loop pay is the total red pay of the cards in their workshop.`, through `arranged`:
    - `shownPlayerValues` holds `loop pay`;
    - `view('p1').playerValues` has no `loop pay` for p0, whose workshop holds the looping Vase, and has `loop pay: 0` for p1.
  - **The phrases counted.** Spy on `PhraseLibrary.prototype.value` while running `registerPlayerValuePhrases(new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES]))`. The values registered are exactly `[PLAYER_TOTAL]`. A new value line must be judged here first.
  - **`readSeatExtras`.**
    - It reads back the `GAUGED_GAME` view after a JSON round trip.
    - It is null for `playerValues: { p0: { 'red force': '2' } }` and for `{ p0: 3 }`.
    - It accepts extras without `playerValues`.
  - **(guard)** A new `it.each` over Hearts, Color Match, Venom, Rent Day and `CREW_GAME`: `'playerValues' in seatExtras(…)` is false for every seat.

  In `startup-simulator.test.ts`, append `describe('what the view says about each player')`:
  - `shownPlayerValues(game)` is `['blue supply', 'red supply', 'blue demand', 'red demand', 'blue load', 'red load', 'qa supply', 'bug load', 'qa spent']`.
    - `bugged products` is not there: it reads `bug mark`, then `bugged`, whose `its bugs are more than 0` worked-view doesn't count as card-only (G1).
  - `gaugePairs(game)` is `[['blue supply', 'blue demand'], ['red supply', 'red demand']]`, and `dimFlags(game)` is `['offline']`.
  - **The arrangement.** A 3-player engine at seed 1 with S its start player and N the next seat:
    - a Dating App and a Smart Lock go to `operations-N`;
    - the first Firmware Specialist goes to `ops-team-N`.
  - **The checks**, for each viewer:
    - `playerValues[N]` is `{ 'blue supply': 2, 'red supply': 0, 'blue demand': 1, 'red demand': 1, 'blue load': 1, 'red load': 1, 'qa supply': 0, 'bug load': 0, 'qa spent': 0 }`;
    - with `red mode` on the Firmware Specialist and `offline` on the Dating App, it is `{ 'blue supply': 0, 'red supply': 2, 'blue demand': 0, 'red demand': 1, 'blue load': 1, 'red load': 1, 'qa supply': 0, 'bug load': 0, 'qa spent': 0 }`;
    - with `bugs: 2` on the Smart Lock as well, `bug load` is 2.
  - **How the numbers come** (§20.B, §20.C): the Firmware Specialist is flex with output 2; the Dating App's maintenance is 1 Blue / 0 Red, and the Smart Lock's 0 / 1.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/lang/worked-view.test.ts src/games/startup-simulator.test.ts`. Expected: FAIL (the functions and `playerValues` are missing).
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/engine/core/lang src/games src/pages/designer`, then `bun run test` and `bun run typecheck`.
  - 4-2's "plays the same game through the page's view as without it" must pass unchanged.
  - If the long runs take more than a third longer than at BASE, report the timing.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/lang/library/player-value-phrases.ts src/engine/core/lang/worked-view.ts src/engine/core/lang/board-view.ts \
  src/engine/core/lang/testing.ts src/engine/core/lang/worked-view.test.ts src/games/startup-simulator.test.ts
git commit -F - <<'EOF'
feat(lang): the view gives every seat the values about each player that add up cards everyone can see, and the game says which pairs a button waits on and which flags leave a card out

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 2: Faded cards, Bug badges and mode labels

Before starting: re-check 4-2's flags, counts, phases, hints and button labels at HEAD.

**Files:**
- Modify: `src/engine/core/scene.ts` (`CardDecor.dim`), `src/engine/pixi/card-sprite.ts`
- Modify: `src/pages/designer/board-text.ts`, `src/pages/designer/playtest.tsx`
- Test:
  - `src/engine/pixi/card-sprite.test.ts` (append);
  - `src/pages/designer/board-text.test.ts` (append; two existing lines change);
  - `src/pages/designer/playtest-fitted.test.tsx` (append).

**Interfaces:**
- Consumes: Task 1's `dimFlags`; `counted` (`refs.ts`); `zoneInfo`.
- Produces (for Task 3 and the browser check):

```ts
// scene.ts
export type CardDecor = { ring?: 'choice' | 'chosen'; caption?: string; badge?: string; dim?: boolean };
// board-text.ts
/** The counts on a card that no count part reads, each not 0, in the order declared: '2 dents', '1 fixed dent'. None for a face-down card. */
export function loneCounts(card: CardState, game: CompiledGame): string[];
/** The badge of each card on a Board (a zone each player has that everyone can see, cards on cards too) that has one: see Page copy. */
export function boardBadges(game: CompiledGame, cards: CardState[], worked?: WorkedView): { [cardId: string]: string };
/** The ids of the cards on a Board that have a flag of `dimFlags(game)` set, in the order given. */
export function boardDims(game: CompiledGame, cards: CardState[]): string[];
// playtest-fitted.test.tsx, module level, for Task 3
/** setUp() with a Dating App and a Smart Lock in N's operations and the first Firmware Specialist in N's ops team. */
const modesBoard: () => GameState;
/** The Choices group, the names of its buttons, and a click on one of them; named apart from 3-2's describe-local `choices`/`options`/`answer`. */
const askedGroup: () => HTMLElement; const askedOptions: () => string[]; const answerAsked: (value: string) => void;
/** The labels of the seat's buttons, in order, read from the `seat-buttons` room. */
const seatButtons: () => string[];
```

- **`CardSprite.setDecor`** also sets both face sprites' `alpha`: `0.4` when `decor.dim` is true, else 1. The ring, caption and badge are untouched.
- **`loneCounts`.** A count is read by `countParts` when it has a column on the card, or rides on a count that has one. Every other declared card count that isn't 0 on the card is lone. It reads as `counted(n, name)`.
- **`boardText`.** The square brackets hold `countParts` and then `loneCounts`. A card with lone counts but no count parts gets the brackets too: `Potter (tired) [1 dent]`.
- **`playtest.tsx`.** `decor` takes its badges from `boardBadges(game, placed, worked)`, and sets `dim: true` on the ids `boardDims(game, placed)` gives. Each id gets only the parts it has.

- [ ] **Step 1: Write the failing tests.**

  In `card-sprite.test.ts`, append `describe('dim')`, with its own `kids`:
  - `setDecor({ dim: true })` gives both face sprites (children 0 and 1) alpha 0.4.
  - `setDecor({ dim: true, badge: 'busy', ring: 'chosen' })` keeps `card-badge` and `card-ring` at alpha 1.
  - `setDecor({ caption: 'x' })` and `setDecor(null)` bring the faces back to 1.
  - **(guard)** 1b-3's Hearts guard in `pixi-table.test.ts` passes unchanged.

  In `board-text.test.ts`:
  - **Changed lines.** Exactly these two:
    - `boardBadges(at.state.cards, at.worked)` becomes `boardBadges(shown, at.state.cards, at.worked)`;
    - `boardBadges(at.state.cards, undefined)` becomes `boardBadges(shown, at.state.cards, undefined)`.

    Their expectations stay `{ [at.vase]: 'busy' }` and `{}`.
  - **Append `describe('flags kept, counts no column reads, and faded cards')`.** Its fixture is `MARKED = CREW.replace(TIRED, `${TIRED}\n  Cards can have dents and fixed dents.`)`, laid out by `arrange(MARKED)`.
    - **`loneCounts`.**
      - The Vase with `dents: 2` gives `['2 dents']`.
      - With `dents: 1, 'fixed dents': 1` it gives `['1 dent', '1 fixed dent']`.
      - Its `new red done` 3 is never lone.
      - The tired Potter with `dents: 1` gives `['1 dent']`.
      - A face-down copy gives `[]`.
    - **`boardText`**, with `dents: 2` on the Vase and `dents: 1` on the Potter, is `workshop: Vase [Red 1/2 +3 new, Gold 0/0, 2 dents] with Potter (tired) [1 dent] and Smith; Statue [Red 0/1, Gold 0/2] · idle: Tinker`.
    - **`boardBadges(MARKED game, cards)`.**
      - With `dents: 2` on the Vase it is `{ [vase]: '2 dents', [potter]: 'tired' }`.
      - A stash card with `dents: 1` gets none.
    - **The badge's order.** On `SHOWN` with `Cards can have dents.` added, laid out as the file's describe-local `arrangeShown` lays out `SHOWN` (copy it), and with `tired: true` and `dents: 1` on the busy Vase, `boardBadges(…, worked)[vase]` is `tired, busy, 1 dent`.
    - **`boardDims`**, on a 2-player `RESTING_GAME` with a Vase then a Statue in `workshop-p0`:
      - it is `[statue]` with `resting: true` on the Statue;
      - it is `[]` when the resting card sits in `stash-p0`, or is face-down;
      - `boardDims` of a `CREW` state is `[]`.

  In `playtest-fitted.test.tsx`, append `describe('modes, Offline and Bugs on the Board')`, with the module-level helpers above:
  - **The Hacker's Bug.**
    - The arrangement: `setUp()`, with the Hacker relocated to `bench-${S}` and a To-Do List to `development-${S}`.
    - `click(hacker)`, then `choose('Assign some cards from your bench to a card in your development')`, then `click(todo)`.
    - `table!.decor![todo]` is `{ caption: 'Blue 0/4\nRed 0/0', badge: '1 bug' }`.
    - `board-${S}` reads `development: To-Do List (tier Tier 1, tag App, sector Concept) [Blue 0/4, Red 0/0, 1 bug] with Hacker`.
  - **A declared mode labels the card.**
    - Mount `modesBoard()` and press `End your actions`. `tab(`${N} — to act`)` is selected, and `status()` is `` `seat: ${N} — Your turn — ${hint('modes')}` ``.
    - `click(fs)`: `offered()` is `[['Declare a card in your ops team', true]]`. Choose it:
      - `askedGroup()` reads `Choose one`, and `askedOptions()` is `['Blue', 'Red', 'Cancel']`. The Fixer's QA is not offered to a Firmware Specialist.
      - `ring(fs)` is `'chosen'`.
    - `answerAsked('Red')`: `decor[fs]` is `{ badge: 'red mode' }`, and `board-${N}` contains `ops team: Firmware Specialist (red mode)`.
    - Declare it again from the button list (`Declare a card in your ops team`, `pickNamed('Firmware Specialist')`, `answerAsked('Blue')`): `decor[fs]` is undefined.
  - **Review Focus: an Offline product is faded, and only while it is off.**
    - From the mode test's start, declare Red and press `Confirm your modes`. The status ends with `hint('ops check')`.
    - `click(dating)`: `offered()` is `[['Switch off a card in your operations', true], ['Switch on a card in your operations', 'it is offline']]`.
    - Choose `Switch off …`:
      - `decor[dating]` is `{ caption: 'Blue 0/6\nRed 0/0', badge: 'offline', dim: true }`;
      - `decor[lock]` is `{ caption: 'Blue 0/1\nRed 0/5' }`;
      - `board-${N}` contains `Dating App (tier Tier 1, tag Social, sector Consumer, offline) [Blue 0/6, Red 0/0]`.
    - Switch it back on (click it, then `Switch on …`): `decor[dating]` is `{ caption: 'Blue 0/6\nRed 0/0' }`.
    - Switch it off again, then press `Confirm the products online`:
      - `lineOf(N)` starts `` `${N} 9 capital, 3 actions, 1 market share` ``;
      - `decor[dating].dim` is still true.
    - Press `Undo` twice. `decor[dating]` is `{ caption: 'Blue 0/6\nRed 0/0' }`, and `board-${N}` no longer contains `offline`.
  - **Ops QA cleans a Bug, and its badge goes.**
    - The arrangement: `setUp()`, with:
      - a Dating App and a Mobile Wallet in `operations-${S}`, each with `bugs: 1`;
      - S's Junior QA Tester in `ops-team-${S}`.
    - Mounted: `decor[dating].badge` and `decor[wallet].badge` are `'1 bug'`.
    - Press `End your actions`. The status ends with `hint('engine')`.
    - `click(wallet)`: `offered()` is `[['Clean a card in your operations', true]]`. Choose it, and `tab(`${N} — to act`)` is selected.
    - Click S's tab:
      - `decor[wallet]` is `{ caption: 'Blue 0/4\nRed 0/0' }`, and `decor[dating].badge` is `'1 bug'`;
      - `board-${S}` contains `Mobile Wallet (tier Tier 1, tag Commerce, sector FinTech) [Blue 0/4, Red 0/0]` and `[Blue 0/6, Red 0/0, 1 bug]`.
  - **Review Focus: hidden.**
    - The arrangement: `setUp()`, with `bugs: 2, offline: true` on the card in `backlog-${O}`, and `bugs: 3` on S's own backlog card.
    - `Object.keys(table!.decor!)` contains neither id.
    - `document.body.textContent` contains neither `2 bugs` nor `3 bugs`.
  - **(guard)** The existing `toEqual` decor tests ("hangs the staff under their card…", "captions each card with its need after the cut…") pass unchanged.
  - **The Bug label reads the `bugs` count whether or not `bugged` is shown** (G1). These pins assume it is not. Were it shown, it would come before the count: `bugged, 1 bug`.
  - **How the numbers come** (§20.B, §20.C, §5 Phase B, §20.E):
    - The Firmware Specialist is flex, output 2, salary $2, and the Fixer alone has QA Skill.
    - Blue costs: Dating App 6, To-Do List 4, Mobile Wallet 4. The Smart Lock costs 1 Blue / 5 Red and earns rev 2.
    - At Income: 7 + 2 = 9, the Dating App off and earning nothing. The $2 salary holds N at Income.
    - The Hacker adds 1 Bug when he joins a project. One Junior QA Tester gives 1 QA against 2 Bugs on two products, so the owner picks which to clean.
- [ ] **Step 2: Run** `bunx vitest run src/engine/pixi src/pages/designer`. Expected: the new tests and the two changed lines FAIL, and the guards pass.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/engine/pixi src/engine/react src/pages/designer src/pages/hearts-demo src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/scene.ts src/engine/pixi/card-sprite.ts src/engine/pixi/card-sprite.test.ts src/pages/designer/board-text.ts \
  src/pages/designer/board-text.test.ts src/pages/designer/playtest.tsx src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): a card on a Board is badged with the flags it keeps and the counts no column reads, and drawn faded while a flag leaves it out of a player's total

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 3: The gauges

Before starting: re-check Task 1's `gaugePairs`, `PlayerValuesView` and `GAUGED_GAME`, and Task 2's `modesBoard`, `askedGroup`, `askedOptions`, `answerAsked` and `seatButtons` at HEAD.

**Files:**
- Create: `src/pages/designer/gauges.ts`, `src/pages/designer/gauges.test.ts`
- Modify: `src/pages/designer/tableaux.tsx`, `src/pages/designer/playtest.tsx`
- Test: `src/pages/designer/tableaux.test.ts` (append), `src/pages/designer/playtest-fitted.test.tsx` (append)

**Interfaces:**
- Consumes Task 1's `gaugePairs` and `PlayerValuesView`, and Task 2's test helpers.
- Produces:

```ts
// gauges.ts
export type Gauge = { text: string; short: boolean };
/** Each of `gaugePairs(game)` whose two values `values` has, as the Page copy says; none for undefined. */
export function gaugesOf(game: CompiledGame, values: { [name: string]: number } | undefined): Gauge[];
// tableaux.tsx
export const SHORT_COLOR = '#ff8a65';
export function Tableaux(props: { game; seats; board; cards; worked?: WorkedView; playerValues?: PlayerValuesView }): JSX.Element;
```

- **`Tableaux`.** Under each seat's tableau line, for a seat that is not out, it renders `gauges-${seat}` when `gaugesOf(game, playerValues?.[seat])` is non-empty. The line comes before the seat's Board line.
- **`playtest.tsx`.** `<Tableaux … playerValues={extras?.playerValues} />`.

- [ ] **Step 1: Write the failing tests.**

  In the new `gauges.test.ts`, on `GAUGED_GAME`:
  - `gaugesOf(game, { 'red force': 2, 'red load': 2 })` is `[{ text: 'Red force 2 / load 2', short: false }]`.
  - With `'red force': 1` it is `[{ text: 'Red force 1 / load 2 (short)', short: true }]`.
  - **Review Focus.** Without `red load`, and with `undefined`, it is `[]`.
  - **No shared words.** `GAUGED_GAME` + `Spare:\n  A player's spare is the total skill of the cards in their idle.`, with the stop's line `Only if their spare is at least their red load.`. Then `{ spare: 1, 'red load': 2 }` gives `[{ text: 'Spare 1 / red load 2 (short)', short: true }]`.
  - `gaugesOf(FORCE_GAME, { 'red force': 2, 'red load': 2 })` is `[]`.

  In `tableaux.test.ts`, append `describe('gauges')`. Use a 3-player `GAUGED_GAME` engine arranged as in Task 1, rendered with `board` and `playerValues` from `seatExtras(…, 'p0')`:
  - `gauges-p0` reads `Red force 2 / load 2`, `gauges-p1` reads `Red force 0 / load 1 (short)` and `gauges-p2` reads `Red force 0 / load 0`.
  - `gauges-p1`'s span has `style.color` equal to `SHORT_COLOR`.
  - `gauges-p0`'s previous sibling starts `p0 `, and its next sibling is `board-p0`.
  - **Review Focus.**
    - With p1 marked out (`markOut`), there is no `gauges-p1`.
    - Startup's `Tableaux` without `playerValues` renders no `gauges-` test id.
  - **(guard)** "reads each seat's Board once…" passes unchanged.

  In `playtest-fitted.test.tsx`, append `describe('the gauges, the ops check and the final check')`, with `gauges(seat)` as `screen.getByTestId(`gauges-${seat}`).textContent`:
  - **Every seat's gauges.** Mount `modesBoard()`:
    - `gauges(N)` is `Blue supply 2 / demand 1 · Red supply 0 / demand 1 (short)`;
    - `gauges(S)` is `Blue supply 0 / demand 0 · Red supply 0 / demand 0`;
    - click O's tab: `gauges(N)` reads the same.
  - **Through the ops check.**
    - Press `End your actions`, then declare the Firmware Specialist Red from the button list. `gauges(N)` is `Blue supply 0 / demand 1 (short) · Red supply 2 / demand 1`.
    - Press `Confirm your modes`. The `Confirm the products online` button has `aria-disabled` `true` and title `their blue supply is at least their blue demand`.
    - Press `Switch off a card in your operations`, then `pickNamed('Dating App')`. `gauges(N)` is `Blue supply 0 / demand 0 · Red supply 2 / demand 1`, and the confirm is live.
    - Press it: `lineOf(N)` starts `` `${N} 9 capital` ``.
  - **The final check.**
    - The arrangement: a 2-player state, `createEngine(game, lib, 2, initialState(game, SEED))`, with S2 its start player and L2 the other seat:
      - the Market Crash goes to `crash-pile`;
      - a Dating App and a Mobile Wallet go to `operations-${S2}`;
      - S2's Junior Software Dev goes to `ops-team-${S2}`.
    - Mount with `players: 2`. `gauges(S2)` is `Blue supply 1 / demand 2 (short) · Red supply 0 / demand 0`.
    - Press `End your actions`, then (on L2's tab) `End your actions`:
      - `tab(`${S2} — to act`)` is selected;
      - `status()` is `` `seat: ${S2} — Your turn — ${hint('final check')}` ``;
      - `seatButtons()` is `['Switch off a card in your operations', 'Switch on a card in your operations']`.
    - Press `Switch off …`, then `pickNamed('Mobile Wallet')`:
      - `status()` matches `/Game over/`;
      - `decor[wallet].dim` is true;
      - `gauges(S2)` is `Blue supply 1 / demand 1 · Red supply 0 / demand 0`;
      - `board-${S2}` contains `Mobile Wallet (tier Tier 1, tag Commerce, sector FinTech, offline)`.
  - **Review Focus.** Color Match at 3 has no `gauges-` test id (`screen.queryByTestId(/^gauges-/)` is null).
  - **How the numbers come** (§20.B, §20.C, §12):
    - A Junior Software Dev gives 1 Blue; the Dating App and the Mobile Wallet each need 1 Blue.
    - The round at two is S2 then L2. After it, the final check runs from S2, and L2, with nothing to run, passes at once.
- [ ] **Step 2: Run** `bunx vitest run src/pages/designer`. Expected: the new tests FAIL, and every existing test passes.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/pages/designer src/engine/core/lang src/games`, then `bun run test` and `bun run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/pages/designer/gauges.ts src/pages/designer/gauges.test.ts src/pages/designer/tableaux.tsx src/pages/designer/tableaux.test.ts \
  src/pages/designer/playtest.tsx src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(designer): each player's tableau shows a gauge for every pair of their values a button waits on, marked short until the first covers the second

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 4: A card that sits on a card in a zone where only some do hangs under it

Before starting: re-check the 1b-3 names above and 4-1's `'some'` guard at HEAD. Also check that 4-2 marks the ops team `…, where some cards are on cards in their operations`.

**Files:**
- Modify: `src/engine/core/scene.ts` (`LayoutOptions.keepPlaced`), `src/engine/core/layout.ts` (the row case), `src/engine/core/lang/fit-layout.ts` (`fittedLayout`, `stackOnHolders`)
- Test: `src/engine/core/layout.test.ts` (append), `src/engine/core/lang/fit-layout.test.ts` (append), `src/pages/designer/playtest-fitted.test.tsx` (append)

**Interfaces:**
- Consumes `computeZoneLayout`, `boardDef`, `STACK_GAP`, `STACK_STEP` and `holderIdOf`.
- Produces:

```ts
// scene.ts, LayoutOptions gains:
/** A row's card that carries its own place (numeric `data.x` and `data.y`) is drawn there; the row spaces only the others. */
keepPlaced?: boolean;
```

- **`computeZoneLayout`**, for a `'row'` with `keepPlaced`:
  - such a card's transform is `{ x: data.x, y: data.y, rotation: zr, scale: 1, z }`;
  - the others are spaced as a row of their own count, in order;
  - every card keeps `z = zBase + its index among all`.

  Every other zone lays out as before.
- **`fittedLayout`.** A public zone each player has with `onCards === 'some'` keeps its board row (`boardDef`), with `keepPlaced: true` added to its `layoutOptions`. Nothing else changes.
- **`stackOnHolders`** also walks every def with `layoutOptions?.keepPlaced`:
  - each of its cards whose holder is placed in a slotted def hangs under it exactly as a free zone's card does: same column, closing up, written as `data.x` / `data.y` on a copy;
  - each other card of it that carries `x` or `y` gets a copy without them;
  - every other card is the same object, and the order is kept.

- [ ] **Step 1: Write the failing tests.**

  In `layout.test.ts`:
  - A row at `(0, 0)` with spacing 110 and `keepPlaced` lays out three cards, `a` (`data: { x: 7, y: 9 }`), `b` and `c`:
    - `a` is at `(7, 9)`;
    - `b` is at `(-55, 0)` and `c` at `(55, 0)`.
  - **(guard)** Without `keepPlaced`, the three are at -110, 0 and 110.

  In `fit-layout.test.ts`, append `describe('a zone where only some cards sit on cards')`. It uses `BOARD` with `idle` marked `onCards: 'some', holders: 'workshop'`, as 4-1's guard builds it, at viewer p1:
  - **The def.** `idle-p1` is a `'row'` whose `layoutOptions` are `{ spacing: BOARD_SPACING, maxWidth: 400, keepPlaced: true }`, and `workshop-p1`'s have no `keepPlaced`.
  - **`stackOnHolders`**, given these cards:
    - `j1` in `workshop-p1`, slot 0;
    - `t1` in `idle-p1`, on `j1`;
    - `t2` in `idle-p1`, on nothing;
    - `t3` in `idle-p1`, on nothing, with `data: { x: 5, y: 5 }`;
    - `t4` in `idle-p1`, on `c999`, which is not on the table.

    The checks:
    - `t1` is at `j1`'s x, and `j1`'s y + `CARD_HEIGHT` + `STACK_GAP`;
    - `t2` and `t4` are the same objects;
    - `t3` is a copy whose `data` has neither `x` nor `y`;
    - the order is kept.
  - **Through the layout.** `computeZoneLayout(idle def, the stacked idle cards)` puts `t1` at its place, and spaces `t2`, `t3` and `t4` as a row of three around the def's x.
  - **(guard)** 1b-3's `describe('cards stacked under the card they sit on')` passes unchanged.

  In `playtest-fitted.test.tsx`, append `describe('a Growth Hacker hangs under its product')`:
  - **The arrangement.** `setUp()`, with:
    - a Dating App in `operations-${S}`;
    - the Growth Hacker `putOn` it in `ops-team-${S}`;
    - S's Junior Software Dev in `ops-team-${S}`, on nothing.
  - **The canvas.** Mount it. Let `at` be `computeZoneLayout(operations def, cardsIn(`operations-${S}`)).get(dating)`:
    - the ops team's def is a `'row'` with `layoutOptions.keepPlaced` true;
    - `computeZoneLayout(ops team def, cardsIn(`ops-team-${S}`))` puts the Growth Hacker at `(at.x, at.y + 176)`, and the Junior Software Dev at the def's own transform (alone in the row).
  - **The Board line.** `board-${S}` reads `operations: Dating App (tier Tier 1, tag Social, sector Consumer) [Blue 0/6, Red 0/0] with Growth Hacker · ops team: Junior Software Dev`.
  - **Hidden as before.** Click O's tab: `cardsIn(`ops-team-${S}`)` is `[]`, and `board-${S}` reads the same.
  - **How the numbers come:** 176 is `CARD_HEIGHT` 140 + `STACK_GAP` 36, as 1b-3's development team test has it.
- [ ] **Step 2: Run** `bunx vitest run src/engine/core/layout.test.ts src/engine/core/lang/fit-layout.test.ts src/pages/designer/playtest-fitted.test.tsx`. Expected: the new tests FAIL, and the guards pass.
- [ ] **Step 3: Implement** the interfaces.
- [ ] **Step 4: Run** `bunx vitest run src/engine src/pages/designer src/pages/hearts-demo src/games`, then `bun run test` and `bun run typecheck`. The fitted tests' `misfits` and `unreachableZones` pins must pass unchanged.
- [ ] **Step 5: Commit**

```bash
git add src/engine/core/scene.ts src/engine/core/layout.ts src/engine/core/lang/fit-layout.ts src/engine/core/layout.test.ts \
  src/engine/core/lang/fit-layout.test.ts src/pages/designer/playtest-fitted.test.tsx
git commit -F - <<'EOF'
feat(lang): on a fitted table a card that sits on a card in a zone where only some do hangs under it, and the rest stay in the zone's row

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

### Task 5: The browser check, the README and the final checks

**Files:**
- Modify: `README.md`
- Browser scripts and screenshots go only in `SCRATCH=/tmp/claude-0/-home-user-turnhout/fbd53c51-0292-5f8c-bf20-70c6ad4ed3bd/scratchpad/browser-4-3`.

**Interfaces:** Consumes Tasks 1–4. Produces nothing new.

- [ ] **Step 1: The probe.** Write `$SCRATCH/probe.ts`, run with `bun`, that reads `src/games/startup-simulator.rules` and edits it:
  - it removes `  The start player is chosen at random.`, so p0 starts;
  - after `  The market crash goes into the bottom fifth of the growth deck.` (3-2's P2: before the deal, so every seed sets up), it adds:

```text
  Move the market crash from the growth deck to the crash pile.
  Move the dating app from the seed deck to p1's operations.
  Move the smart lock from the seed deck to p1's operations.
  Move the firmware specialist from the talent deck to p1's ops team.
  Move the growth hacker from the talent deck to p1's bench.
  Move the to-do list from the seed deck to p0's development.
  Move the hacker from the talent deck to p0's bench.
```

  The checks:
  - the edited rules compile with no diagnostics;
  - a 2-player engine at seeds 1 to 10 starts with p0 in `actions`, and each named card is where its line puts it.

  A probe at `effc93b`, before 4-2, does both at seeds 1 to 10. Placed after the deal line instead, seed 4 deals the only Dating App to a backlog first. If either check fails at HEAD, stop and report.
- [ ] **Step 2: The browser check.** Copy 3-2's `$SCRATCH/../browser-3-2/check.cjs` helpers: `at()`, `rowCard()`, the launch, the error collection, `waitFor`, `press`, `pressIn`, `group` and `line`.
  - **Setup.**
    - Regenerate `zones.json` for viewers p0 and p1 from `fittedLayout(game.zones, viewer)`.
    - Run the dev server in the background on 5173 with `--strictPort`, polled with `curl -sf`.
    - Use Chromium with `['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']`, at a viewport of `1600 × 2600`.
    - Expect no `pageerror` and no console error.
  - **The rules.** Load the Startup Simulator sample, `fill` the `Rules` textarea with Step 1's edit, choose `2` and press `Play`.
  - **Screenshots.** Each must show what is listed after it.
    1. **`01-gauges.png`:**
       - `gauges-p0` reads `Blue supply 0 / demand 0 · Red supply 0 / demand 0`;
       - `gauges-p1` reads `Blue supply 2 / demand 1 · Red supply 0 / demand 1 (short)`, the second in orange.
    2. **`02-bug.png`.** Press `Assign some cards from your bench to a card in your development`, `Pick Hacker`, `Confirm` and `Pick To-Do List`:
       - the To-Do List has a red `1 bug` label in its top-right corner;
       - `board-p0` reads `… [Blue 0/4, Red 0/0, 1 bug] with Hacker`.
    3. **`03-modes.png`.** Press `End your actions`:
       - the `p1 — to act` tab is selected;
       - the status reads `Your turn — Choose what each flex Senior and the Fixer work on…`;
       - the buttons are `Declare a card in your development team` (greyed), `Declare a card in your ops team` and `Confirm your modes`.
    4. **`04-declare.png`.** Click the Firmware Specialist on the canvas (`rowCard(ops team p1, 0, 1, BOARD)`) and choose `Declare a card in your ops team`:
       - `Choices` reads `Choose one`, with `Blue`, `Red` and `Cancel`;
       - the card is ringed green.
    5. **`05-red.png`.** Click `Red`:
       - the card has a red `red mode` label;
       - `gauges-p1` reads `Blue supply 0 / demand 1 (short) · Red supply 2 / demand 1`.
    6. **`06-ops-check.png`.** Press `Confirm your modes`:
       - the status reads the ops check's hint;
       - `Confirm the products online` is greyed.
    7. **`07-offline.png`.** Click the Dating App (`rowCard(operations p1, 0, 2, BOARD)`) and choose `Switch off a card in your operations`:
       - the Dating App is drawn faded, with an `offline` label;
       - `gauges-p1` reads `Blue supply 0 / demand 0 · Red supply 2 / demand 1`;
       - `board-p1` names `Dating App (tier Tier 1, tag Social, sector Consumer, offline)`.
    8. **`08-income.png`.** Press `Confirm the products online`:
       - p1's line starts `p1 9 capital`;
       - the status reads Income's hint;
       - the Dating App is still faded.
    9. **`09-hung.png`.** Press `Pay salaries` (p1's line starts `p1 7 capital`). Then press `Assign some cards from your bench to a card in your operations`, `Pick Growth Hacker`, `Confirm` and `Pick Smart Lock`:
       - the Growth Hacker hangs under the Smart Lock, clear of its caption;
       - the Firmware Specialist, still labelled `red mode`, stays in the ops team row;
       - `board-p1` names `Smart Lock (…) [Blue 0/1, Red 0/5] with Growth Hacker`.
    10. **`10-final-check.png`.** Press `Recall some cards from your ops team to your bench`, `Pick Firmware Specialist` and `Confirm`, then `End your actions`:
        - the `p1 — to act` tab is selected;
        - the status reads `Your turn — After the last round…`;
        - the only buttons are `Switch off …` and `Switch on …`;
        - `gauges-p1` reads `Blue supply 0 / demand 0 · Red supply 0 / demand 1 (short)`;
        - the Smart Lock has a red `1 bug` label, the Growth Hacker's at the end of p1's turn with no Architect, and the Growth Hacker still hangs under it.
    11. **`11-over.png`.** Click the Smart Lock (`rowCard(operations p1, 1, 2, BOARD)`) and choose `Switch off …`:
        - the status starts `Game over`;
        - both products are faded.
    12. **`12-color-match.png`.** Color Match at 3: three panels as before, with no gauges, labels or fades.
  - **Afterwards.** Open every PNG (Read) and check it against its list. Then stop the dev server.
- [ ] **Step 3: Update the README.**
  - **"A table too big for one screen", `The other seats`.** Add: under a player's line, the gauges. Each pair of their values that a button waits on (`Only if their blue supply is at least their blue demand.`) reads `Blue supply 2 / demand 1`, and is marked `(short)` in orange while the first is below the second. Only values the rules add up over zones everyone can see are shown.
  - **`The Board`.** Add three bullets:
    - **The badge.** A card's corner label also names the flags it keeps (`red mode`, `offline`), before the worked ones, and its counts that no column reads (`2 bugs`).
    - **The Board line.** Those counts also go in the line's square brackets: `[Blue 0/4, Red 0/0, 1 bug]`.
    - **Faded cards.** A card that a player's total leaves out by a flag (`… that are not offline`) is drawn faded.
    - **Cards that hang.** In a zone where only some cards sit on cards (`…, where some cards are on cards in their operations`), a card that sits on one hangs under it, and the rest stay in the row: the Growth Hacker under its product.
  - **Plan 4-1's paragraph** ("Values about players, …"). Before its `Startup Simulator` bullet, add an `In the playtest` bullet: the values that add up cards in zones everyone can see go into every seat's view, and a pair a button compares shows as a gauge.
  - **Its `Startup Simulator` bullet.** Add that the declaration (`Declare a card in your ops team`, then `Choose one`), the ops check (`Switch off …`, `Switch on …`, `Confirm the products online`), Ops QA's `Clean a card in your operations` and the final check are played under the seat's buttons, or by clicking the card.
- [ ] **Step 4: Run** `bun run test` and `bun run typecheck`. The passing count is the starting count plus this plan's new tests. Then run these checks. Each must print nothing, except where noted.

```bash
# Startup Simulator's words in shared code, slices 3 and 4 included, tests included
git diff "$BASE" -- src/engine src/pages src/utils ':!src/pages/designer/designer-page.test.tsx' ':!src/pages/designer/playtest-fitted.test.tsx' \
  ':!src/pages/designer/tableaux.test.ts' ':!src/pages/designer/samples.ts' | grep '^+[^+]' \
  | grep -iE '\b(capital|talents?|agency|juniors?|backlogs?|growth|crash(es)?|vaporware|universit(y|ies)|bench(es)?|ideation|start-?ups?|research(es)?|recruit(s|ed|ing)?|products?|job market|idea pool|greenlight(s|ed|ing)?|launch(es|ed|ing)?|pivot(s|ed|ing)?|salar(y|ies)|payroll|projects?|cubes?|ops|operations|onboarding|scouting|sourcing|market share|tags?|leads?|leading|licen[cs]es?|tiers?|stall(s|ed|ing)?|sectors?|expertise|modes?|bandwidths?|bugs?|qa|online|offline|maint(enance)?|suppl(y|ies)|demands?)\b|\bseed (decks?|markets?|cards?|products?)\b'
# protected files
git diff --stat "$BASE" -- src/engine/core/game-state.ts src/engine/core/flow.ts src/engine/core/game-engine.ts src/pages/hearts-demo
# a pure core
git diff "$BASE" -- src/engine/core ':!*.test.ts' | grep '^+' | grep -E "from '(pixi|react|@/components|@/utils)|\b(document|window)\.|Math\.random|Date\.now"
# no rules changed
git diff --stat "$BASE" -- src/games/startup-simulator.rules
# existing test lines removed or changed: only Task 2's two
git diff "$BASE" -- '*.test.ts' '*.test.tsx' | grep -E '^-[^-]'
```

  - The last check prints exactly the two `boardBadges` lines of `board-text.test.ts`, plus 4-1's `fit-layout.test.ts` guard line if Task 4 named it.
  - Also read the `+` lines of `src/engine` and `src/pages` for "source" in the game sense.
- [ ] **Step 5: Run the four games alone.** `bunx vitest run src/games/hearts.test.ts src/games/color-match.test.ts src/games/venom.test.ts src/games/rent-day.test.ts src/pages/hearts-demo src/engine/input` passes, and Rent Day still has 108 examples.
- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -F - <<'EOF'
docs: the gauges under each player's line, badges for kept flags and counts no column reads, faded cards, and slice 4's steps under the buttons, checked in a browser

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01P94KqgHdj4g9qH4TtoLUYC
EOF
```

---

## Gaps against plans 4-1 and 4-2

- **G1. `bugged` is not shown, though 4-2's forward note says it is.**
  - 4-2's forward note and its Task 3 pin expect `shownFlags(game)` to gain `bugged`.
  - `Bugged:`'s `Only if its bugs are more than 0.` is card-number-phrases' `its {attribute} are more than {int}`. That phrase is not in worked-view's card-only set (3-2's phrase-set test; 4-1's P17 list), so `bugged`, `bug mark` and `bugged products` stay unshown. 4-2 Task 3's pin `['stalled', 'efficient in ops', 'bugged']` fails as written.
  - Failing closed is right here. The controller amends 4-2 Task 3's pin at its pre-flight.
  - The Bug label reads the `bugs` count whether or not `bugged` is shown, and Task 1's pins assume it is not.
- **Settled by the controller:**
  - G2, a flex Senior in Blue showing no mode, is call 4.
  - G3, the Growth Hacker hanging under its product, is planned as Task 4.

## Forward notes

- **Slice 9 (face-down cards in a public zone).**
  - `shownPlayerValues` treats a public zone as fully seen. A total over operations, such as `blue load` or `bug load`, would then tell rivals about a Face-Down product's numbers.
  - Slice 9 must leave face-down cards out of the shown player values: leave out their numbers, or stop showing such a total.
  - The worked view must keep skipping a card whose face the seat doesn't see. It does so today through `seesFace`; otherwise the totals reveal hidden cards.
